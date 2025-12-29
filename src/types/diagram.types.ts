import { SchemaAST } from "./schema.types";

export interface Layout {
  nodes: Record<string, { x: number; y: number }>;
  zoom: number;
  viewport: {
    x: number;
    y: number;
  };
}

export interface Preferences {
  theme?: string;
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
}

export interface DiagramSetting {
  ast: SchemaAST;
  layout: Layout;
  preferences: Preferences;
}

export interface Diagram {
  _id?: string;
  userId?: string | null;
  name: string;
  description: string;
  setting: DiagramSetting;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface DiagramHistory {
  _id?: string;
  diagramId: string;
  userId?: string | null;
  name: string;
  description: string;
  setting: DiagramSetting;
  remark?: string;
  createdAt?: Date;
}

