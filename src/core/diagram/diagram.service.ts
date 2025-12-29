import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@src/database/database.service";
import { ParserService } from "@src/core/parser/parser.service";
import { ModelExporter } from "@dbml/core";
import { ResponseUtil } from "@src/shared/util/response.util";
import { DEFAULT_DBML } from "@src/constants";
import type { ApiResponse } from "@src/types";
import type { Diagram } from "@src/types";

@Injectable()
export class DiagramService {
  constructor(
    private readonly database: DatabaseService,
    private readonly parserService: ParserService
  ) {}

  async getDefault(): Promise<ApiResponse<{ dbmlText: string; ast: any }>> {
    try {
      const parseResult = await this.parserService.parse(DEFAULT_DBML);
      if (!parseResult.status || !parseResult.data) {
        return ResponseUtil.error(
          parseResult.error || "Failed to parse default DBML",
          500
        );
      }

      return ResponseUtil.success({
        dbmlText: DEFAULT_DBML,
        ast: parseResult.data.ast,
      });
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to get default diagram",
        500
      );
    }
  }

  async findById(id: string, userId?: string): Promise<ApiResponse<Diagram>> {
    try {
      const query: any = { _id: id, deletedAt: null };
      if (userId) {
        query.userId = userId;
      }

      const diagram = await this.database.Diagram.findOne(query).exec();
      if (!diagram) {
        return ResponseUtil.error("Diagram not found", 404);
      }

      return ResponseUtil.success(diagram.toObject());
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to find diagram",
        500
      );
    }
  }

  async create(
    userId: string,
    name: string,
    description?: string
  ): Promise<ApiResponse<Diagram>> {
    try {
      const parseResult = await this.parserService.parse(DEFAULT_DBML);
      if (!parseResult.status || !parseResult.data) {
        return ResponseUtil.error(
          parseResult.error || "Failed to parse default DBML",
          500
        );
      }

      const diagram = await this.database.Diagram.create({
        userId,
        name,
        description: description || "",
        dbmlText: DEFAULT_DBML,
        status: "idle",
        validationErrors: [],
        setting: {
          modelJson: parseResult.data.modelJson,
          layout: {},
          preferences: {},
        },
      });

      return ResponseUtil.success(diagram.toObject());
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to create diagram",
        500
      );
    }
  }

  async update(
    id: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      dbmlText?: string;
      status?: "editing" | "idle" | "saving";
    }
  ): Promise<ApiResponse<Diagram>> {
    try {
      const diagram = await this.database.Diagram.findOne({
        _id: id,
        userId,
        deletedAt: null,
      }).exec();

      if (!diagram) {
        return ResponseUtil.error("Diagram not found", 404);
      }

      if (updates.dbmlText) {
        const parseResult = await this.parserService.parse(updates.dbmlText);
        if (!parseResult.status || !parseResult.data) {
          return ResponseUtil.error(
            parseResult.error || "Failed to parse DBML",
            400
          );
        }

        diagram.dbmlText = updates.dbmlText;
        diagram.setting.modelJson = parseResult.data.modelJson;
        diagram.validationErrors = parseResult.data.errors;
        diagram.status = parseResult.data.errors.length > 0 ? "error" : "idle";
      }

      if (updates.name !== undefined) {
        diagram.name = updates.name;
      }

      if (updates.description !== undefined) {
        diagram.description = updates.description;
      }

      if (updates.status !== undefined) {
        diagram.status = updates.status;
      }

      await diagram.save();

      return ResponseUtil.success(diagram.toObject());
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to update diagram",
        500
      );
    }
  }

  async list(userId: string): Promise<ApiResponse<Diagram[]>> {
    try {
      const diagrams = await this.database.Diagram.find({
        userId,
        deletedAt: null,
      })
        .sort({ updatedAt: -1 })
        .exec();

      return ResponseUtil.success(diagrams.map((d) => d.toObject()));
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to list diagrams",
        500
      );
    }
  }

  async delete(id: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      const diagram = await this.database.Diagram.findOne({
        _id: id,
        userId,
        deletedAt: null,
      }).exec();

      if (!diagram) {
        return ResponseUtil.error("Diagram not found", 404);
      }

      diagram.deletedAt = new Date();
      await diagram.save();

      return ResponseUtil.success(true);
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to delete diagram",
        500
      );
    }
  }
}

