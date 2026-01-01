import { Injectable } from "@nestjs/common";
import { Parser, ModelExporter } from "@dbml/core";
import type Database from "@dbml/core/types/model_structure/database";
import type Table from "@dbml/core/types/model_structure/table";
import type Ref from "@dbml/core/types/model_structure/ref";
import type Field from "@dbml/core/types/model_structure/field";
import { SchemaAST, TableNode, Column, RelationshipEdge } from "@src/types";

@Injectable()
export class DbmlConverterService {
  private readonly parser = new Parser();
  convert(database: Database): SchemaAST {
    const tables: TableNode[] = [];
    const relationships: RelationshipEdge[] = [];

    for (const schema of database.schemas) {
      for (const table of schema.tables) {
        const tableNode = this.convertTable(table);
        tables.push(tableNode);
      }
    }

    for (const schema of database.schemas) {
      for (const ref of schema.refs) {
        const relationship = this.convertRef(ref);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    return { tables, relationships };
  }

  private convertTable(table: Table): TableNode {
    const columns: Column[] = table.fields.map((field: Field) =>
      this.convertField(field)
    );

    return {
      id: `table_${table.id}`,
      name: table.name,
      columns,
      comment: table.note || undefined,
    };
  }

  private convertField(field: Field): Column {
    const column: Column = {
      name: field.name,
      type: this.getFieldType(field.type),
      primaryKey: field.pk || false,
      nullable: !field.not_null,
      unique: field.unique || false,
      autoIncrement: field.increment || false,
    };

    if (field.dbdefault !== undefined && field.dbdefault !== null) {
      column.defaultValue = field.dbdefault;
    }

    if (field.endpoints && field.endpoints.length > 0) {
      const endpoint = field.endpoints[0];
      if (endpoint.tableName) {
        column.foreignKey = {
          table: endpoint.tableName,
          column: endpoint.fieldNames?.[0] || field.name,
        };

        if (endpoint.relation) {
          const onDelete = this.mapRelationAction(endpoint.relation.onDelete);
          const onUpdate = this.mapRelationAction(endpoint.relation.onUpdate);
          if (onDelete) column.foreignKey.onDelete = onDelete;
          if (onUpdate) column.foreignKey.onUpdate = onUpdate;
        }
      }
    }

    return column;
  }

  private convertRef(ref: Ref): RelationshipEdge | null {
    if (!ref.endpoints || ref.endpoints.length < 2) {
      return null;
    }

    const [fromEndpoint, toEndpoint] = ref.endpoints;

    if (!fromEndpoint.tableName || !toEndpoint.tableName) {
      return null;
    }

    const fromFieldNames = fromEndpoint.fieldNames || [];
    const toFieldNames = toEndpoint.fieldNames || [];

    if (fromFieldNames.length === 0 || toFieldNames.length === 0) {
      return null;
    }

    const relationType = this.determineRelationType(
      fromEndpoint.relation,
      toEndpoint.relation
    );

    return {
      id: `rel_${ref.id}`,
      fromTable: fromEndpoint.tableName,
      fromColumn: fromFieldNames[0],
      toTable: toEndpoint.tableName,
      toColumn: toFieldNames[0],
      type: relationType,
    };
  }

  private getFieldType(type: any): string {
    return type.type_name || "string";
    //let typeName = type.typeName;
    //if (typeof type === "string") {
    //  typeName = type;
    //}
    //if (type && type.value) {
    //  typeName = String(type.value);
    //}
    //typeName = typeName || "string";
    //console.log("typeName", typeName);
    //return typeName;
  }

  private mapRelationAction(action: any): "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | undefined {
    if (!action) return undefined;
    const actionStr = String(action).toUpperCase();
    if (["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"].includes(actionStr)) {
      return actionStr as "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
    }
    return undefined;
  }

  private determineRelationType(
    fromRelation: any,
    toRelation: any
  ): "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY" {
    if (!fromRelation || !toRelation) {
      return "ONE_TO_MANY";
    }

    const fromType = fromRelation.type?.toUpperCase();
    const toType = toRelation.type?.toUpperCase();

    if (fromType === "ONE" && toType === "ONE") {
      return "ONE_TO_ONE";
    }
    if (fromType === "MANY" && toType === "MANY") {
      return "MANY_TO_MANY";
    }

    return "ONE_TO_MANY";
  }

  convertToDbml(ast: SchemaAST): string {
    const dbmlLines: string[] = [];

    for (const table of ast.tables) {
      dbmlLines.push(`Table ${table.name} {`);
      
      for (const column of table.columns) {
        const columnParts: string[] = [column.name, column.type];
        const constraints: string[] = [];

        if (column.primaryKey) {
          constraints.push("primary key");
        }
        if (!column.nullable) {
          constraints.push("not null");
        }
        if (column.unique) {
          constraints.push("unique");
        }
        if (column.autoIncrement) {
          constraints.push("increment");
        }
        if (column.defaultValue !== undefined) {
          constraints.push(`default: ${this.formatDefaultValue(column.defaultValue)}`);
        }

        if (constraints.length > 0) {
          columnParts.push(`[${constraints.join(", ")}]`);
        }

        dbmlLines.push(`  ${columnParts.join(" ")}`);
      }

      if (table.comment) {
        dbmlLines.push(`  Note: '${table.comment}'`);
      }

      dbmlLines.push("}");
      dbmlLines.push("");
    }

    for (const rel of ast.relationships) {
      const relationSymbol = this.getRelationSymbol(rel.type);
      dbmlLines.push(
        `Ref: ${rel.fromTable}.${rel.fromColumn} ${relationSymbol} ${rel.toTable}.${rel.toColumn}`
      );
    }

    const dbmlText = dbmlLines.join("\n").trim();
    
    const database = this.parser.parse(dbmlText, "dbml") as Database;
    return ModelExporter.export(database.normalize(), "dbml");
  }

  private formatDefaultValue(value: string | number | boolean): string {
    if (typeof value === "string") {
      return `'${value}'`;
    }
    return String(value);
  }

  private getRelationSymbol(type: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY"): string {
    switch (type) {
      case "ONE_TO_ONE":
        return "-";
      case "MANY_TO_MANY":
        return "-";
      case "ONE_TO_MANY":
      default:
        return ">";
    }
  }

  private astTableToDbmlTable(table: TableNode): any {
    return {
      id: parseInt(table.id.replace("table_", "")) || 0,
      name: table.name,
      note: table.comment || "",
      fields: table.columns.map((col, index) => this.astColumnToDbmlField(col, index)),
    };
  }

  private astColumnToDbmlField(column: Column, index: number): any {
    const field: any = {
      id: index,
      name: column.name,
      type: {
        type_name: column.type,
      },
      pk: column.primaryKey || false,
      not_null: !column.nullable,
      unique: column.unique || false,
      increment: column.autoIncrement || false,
    };

    if (column.defaultValue !== undefined) {
      field.dbdefault = column.defaultValue;
    }

    if (column.foreignKey) {
      field.endpoints = [
        {
          tableName: column.foreignKey.table,
          fieldNames: [column.foreignKey.column],
          relation: {
            type: "1",
          },
        },
      ];

      if (column.foreignKey.onDelete) {
        field.endpoints[0].relation.onDelete = column.foreignKey.onDelete;
      }
      if (column.foreignKey.onUpdate) {
        field.endpoints[0].relation.onUpdate = column.foreignKey.onUpdate;
      }
    }

    return field;
  }

  private astRelationshipToDbmlRef(rel: RelationshipEdge): any {
    const relationType = this.mapRelationshipTypeToDbml(rel.type);

    return {
      id: parseInt(rel.id.replace("rel_", "")) || 0,
      name: rel.id,
      endpoints: [
        {
          tableName: rel.fromTable,
          fieldNames: [rel.fromColumn],
          relation: {
            type: relationType.from,
          },
        },
        {
          tableName: rel.toTable,
          fieldNames: [rel.toColumn],
          relation: {
            type: relationType.to,
          },
        },
      ],
    };
  }

  private mapRelationshipTypeToDbml(
    type: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY"
  ): { from: string; to: string } {
    switch (type) {
      case "ONE_TO_ONE":
        return { from: "1", to: "1" };
      case "MANY_TO_MANY":
        return { from: "*", to: "*" };
      case "ONE_TO_MANY":
      default:
        return { from: "1", to: "*" };
    }
  }
}

