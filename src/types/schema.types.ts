export interface Column {
  name: string;
  type: string;
  primaryKey?: boolean;
  foreignKey?: ForeignKeyReference;
  nullable?: boolean;
  defaultValue?: string | number | boolean;
  unique?: boolean;
  autoIncrement?: boolean;
}

export interface ForeignKeyReference {
  table: string;
  column: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface TableNode {
  id: string;
  name: string;
  columns: Column[];
  comment?: string;
}

export interface RelationshipEdge {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
}

export interface SchemaAST {
  tables: TableNode[];
  relationships: RelationshipEdge[];
}

