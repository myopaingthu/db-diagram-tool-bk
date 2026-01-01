import { IsString, IsOptional, IsEnum, IsArray, IsObject } from "class-validator";

export type DiagramStatus = "idle" | "parsing" | "error" | "editing" | "saving";

export class CreateDiagramDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDiagramDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dbmlText?: string;

  @IsOptional()
  @IsEnum(["idle", "parsing", "error", "editing", "saving"])
  status?: DiagramStatus;
}

export class SyncDiagramDto {
  @IsOptional()
  @IsString()
  dbmlText?: string;

  @IsOptional()
  @IsObject()
  ast?: any;

  @IsOptional()
  @IsArray()
  nodes?: any[];

  @IsOptional()
  @IsArray()
  edges?: any[];

  @IsOptional()
  @IsArray()
  errors?: any[];

  @IsOptional()
  @IsEnum(["idle", "parsing", "error", "editing", "saving"])
  status?: DiagramStatus;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

