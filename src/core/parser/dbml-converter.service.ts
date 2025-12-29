import { Injectable } from "@nestjs/common";
import type Database from "@dbml/core/types/model_structure/database";
import type Table from "@dbml/core/types/model_structure/table";
import type Ref from "@dbml/core/types/model_structure/ref";
import type Field from "@dbml/core/types/model_structure/field";
import { SchemaAST, TableNode, Column, RelationshipEdge } from "@src/types";

@Injectable()
export class DbmlConverterService {
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
    if (typeof type === "string") {
      return type;
    }
    if (type && type.value) {
      return String(type.value);
    }
    return "string";
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
}

