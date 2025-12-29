import { Injectable } from "@nestjs/common";
import type Database from "@dbml/core/types/model_structure/database";
import type Table from "@dbml/core/types/model_structure/table";
import { ValidationResult, ValidationError } from "@src/types";

@Injectable()
export class ValidatorService {
  validate(database: Database): ValidationResult {
    const errors: ValidationError[] = [];

    const tableNames = new Set<string>();
    const tableMap = new Map<string, Table>();

    for (const schema of database.schemas) {
      for (const table of schema.tables) {
        if (tableNames.has(table.name)) {
          errors.push({
            table: table.name,
            message: `Duplicate table name: ${table.name}`,
            code: "DUPLICATE_TABLE",
          });
        } else {
          tableNames.add(table.name);
          tableMap.set(table.name, table);
        }

        if (!table.name || table.name.trim() === "") {
          errors.push({
            table: table.name || "unknown",
            message: "Table name is required",
            code: "MISSING_TABLE_NAME",
          });
        }

        if (!table.fields || table.fields.length === 0) {
          errors.push({
            table: table.name,
            message: `Table ${table.name} must have at least one column`,
            code: "EMPTY_TABLE",
          });
        }

        for (const field of table.fields) {
          if (!field.name || field.name.trim() === "") {
            errors.push({
              table: table.name,
              column: field.name || "unknown",
              message: "Column name is required",
              code: "MISSING_COLUMN_NAME",
            });
          }

          if (!field.type) {
            errors.push({
              table: table.name,
              column: field.name,
              message: `Column ${field.name} must have a type`,
              code: "MISSING_COLUMN_TYPE",
            });
          }
        }
      }

      for (const ref of schema.refs) {
        if (!ref.endpoints || ref.endpoints.length < 2) {
          errors.push({
            message: `Reference ${ref.name || "unnamed"} must have at least 2 endpoints`,
            code: "INVALID_REFERENCE",
          });
          continue;
        }

        const [fromEndpoint, toEndpoint] = ref.endpoints;

        if (!fromEndpoint.tableName || !toEndpoint.tableName) {
          errors.push({
            message: `Reference ${ref.name || "unnamed"} has invalid endpoints`,
            code: "INVALID_REFERENCE_ENDPOINTS",
          });
          continue;
        }

        const fromTableName = fromEndpoint.tableName;
        const toTableName = toEndpoint.tableName;

        if (!tableNames.has(fromTableName)) {
          errors.push({
            table: fromTableName,
            message: `Reference points to non-existent table: ${fromTableName}`,
            code: "INVALID_REFERENCE_TABLE",
          });
        }

        if (!tableNames.has(toTableName)) {
          errors.push({
            table: toTableName,
            message: `Reference points to non-existent table: ${toTableName}`,
            code: "INVALID_REFERENCE_TABLE",
          });
        }

        if (fromEndpoint.fieldNames && fromEndpoint.fieldNames.length > 0) {
          const fieldName = fromEndpoint.fieldNames[0];
          const table = tableMap.get(fromTableName);
          if (table) {
            const field = table.fields.find((f) => f.name === fieldName);
            if (!field) {
              errors.push({
                table: fromTableName,
                column: fieldName,
                message: `Reference column ${fieldName} does not exist in table ${fromTableName}`,
                code: "INVALID_REFERENCE_COLUMN",
              });
            }
          }
        }

        if (toEndpoint.fieldNames && toEndpoint.fieldNames.length > 0) {
          const fieldName = toEndpoint.fieldNames[0];
          const table = tableMap.get(toTableName);
          if (table) {
            const field = table.fields.find((f) => f.name === fieldName);
            if (!field) {
              errors.push({
                table: toTableName,
                column: fieldName,
                message: `Reference column ${fieldName} does not exist in table ${toTableName}`,
                code: "INVALID_REFERENCE_COLUMN",
              });
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

