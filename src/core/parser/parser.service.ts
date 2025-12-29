import { Injectable } from "@nestjs/common";
import { Parser, ModelExporter } from "@dbml/core";
import type Database from "@dbml/core/types/model_structure/database";
import { ApiResponse } from "@src/types";
import { ResponseUtil } from "@src/shared/util/response.util";
import { DbmlConverterService } from "./dbml-converter.service";
import { ValidatorService } from "./validator.service";
import { SchemaAST, ParseError } from "@src/types";

@Injectable()
export class ParserService {
  private readonly parser = new Parser();

  constructor(
    private readonly dbmlConverter: DbmlConverterService,
    private readonly validator: ValidatorService
  ) {}

  async parse(
    dbmlText: string
  ): Promise<
    ApiResponse<{
      ast: SchemaAST;
      modelJson: string;
      errors: ParseError[];
    }>
  > {
    try {
      const database = this.parser.parse(dbmlText, "dbml") as Database;
      const normalizedDatabase = database.normalize();
      const modelJson = ModelExporter.export(normalizedDatabase, "json");
      const ast = this.dbmlConverter.convert(database);
      const validation = this.validator.validate(database);

      const parseErrors: ParseError[] = validation.errors.map((err) => ({
        line: 0,
        message: err.message,
        type: "validation" as const,
        code: err.code,
      }));

      return ResponseUtil.success({
        ast,
        modelJson,
        errors: parseErrors,
      });
    } catch (error: any) {
      console.log("error",error);
      const parseError: ParseError = {
        line: error.line || 0,
        column: error.column,
        message: error.message || "Failed to parse DBML",
        type: "syntax",
      };

      return ResponseUtil.error(parseError.message, 400);
    }
  }

  async rehydrate(modelJson: string): Promise<ApiResponse<Database>> {
    try {
      const database = this.parser.parse(modelJson, "json") as Database;
      return ResponseUtil.success(database);
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to rehydrate database from JSON",
        400
      );
    }
  }
}

