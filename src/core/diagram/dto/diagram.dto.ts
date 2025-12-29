import { IsString, IsOptional, IsEnum } from "class-validator";

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
  @IsEnum(["editing", "idle", "saving"])
  status?: "editing" | "idle" | "saving";
}

