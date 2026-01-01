import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@src/database/database.service";
import { ParserService } from "@src/core/parser/parser.service";
import { ModelExporter } from "@dbml/core";
import { ResponseUtil } from "@src/shared/util/response.util";
import { DEFAULT_DBML } from "@src/constants";
import type { ApiResponse } from "@src/types";
import type { Diagram } from "@src/types";
import type { SyncDiagramDto, UpdateDiagramDto } from "./dto/diagram.dto";

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

      const diagramObj = diagram.toObject();
      const result: any = {
        _id: diagramObj._id,
        dbmlText: diagramObj.dbmlText,
        status: diagramObj.status,
        errors: diagramObj.validationErrors || [],
        ast: diagramObj.setting?.ast || null,
        nodes: diagramObj.setting?.layout?.nodes || [],
        edges: diagramObj.setting?.layout?.edges || [],
        name: diagramObj.name,
        description: diagramObj.description,
      };

      return ResponseUtil.success(result);
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
    updates: UpdateDiagramDto
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

  async list(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<{ diagrams: Diagram[]; total: number; page: number; limit: number; totalPages: number }>> {
    try {
      const skip = (page - 1) * limit;
      
      const [diagrams, total] = await Promise.all([
        this.database.Diagram.find({
          userId,
          deletedAt: null,
        })
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.database.Diagram.countDocuments({
          userId,
          deletedAt: null,
        }).exec(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success({
        diagrams: diagrams.map((d) => d.toObject()),
        total,
        page,
        limit,
        totalPages,
      });
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

  async sync(
    userId: string,
    id: string | undefined,
    dto: SyncDiagramDto
  ): Promise<ApiResponse<Diagram>> {
    try {
      if (id) {
        const diagram = await this.database.Diagram.findOne({
          _id: id,
          userId,
          deletedAt: null,
        }).exec();

        if (!diagram) {
          return ResponseUtil.error("Diagram not found", 404);
        }

        if (dto.dbmlText !== undefined) {
          diagram.dbmlText = dto.dbmlText;
        }

        if (dto.ast !== undefined) {
          diagram.setting.ast = dto.ast;
          diagram.markModified("setting.ast");
        }

        if (dto.nodes !== undefined || dto.edges !== undefined) {
          if (!diagram.setting.layout) {
            diagram.setting.layout = { nodes: [], edges: [] };
          }
          if (dto.nodes !== undefined) {
            diagram.setting.layout.nodes = dto.nodes;
            diagram.markModified("setting.layout.nodes");
          }
          if (dto.edges !== undefined) {
            diagram.setting.layout.edges = dto.edges;
            diagram.markModified("setting.layout.edges");
          }
        }

        if (dto.errors !== undefined) {
          diagram.validationErrors = dto.errors;
        }

        if (dto.status !== undefined) {
          diagram.status = dto.status;
        }

        if (dto.name !== undefined) {
          diagram.name = dto.name;
        }

        if (dto.description !== undefined) {
          diagram.description = dto.description;
        }
        await diagram.save();

        const diagramObj = diagram.toObject();
        const result: any = {
          _id: diagramObj._id,
          dbmlText: diagramObj.dbmlText,
          status: diagramObj.status,
          errors: diagramObj.validationErrors || [],
          ast: diagramObj.setting?.ast || null,
          nodes: diagramObj.setting?.layout?.nodes || [],
          edges: diagramObj.setting?.layout?.edges || [],
        };

        return ResponseUtil.success(result);
      } else {
        const parseResult = dto.dbmlText
          ? await this.parserService.parse(dto.dbmlText)
          : await this.parserService.parse(DEFAULT_DBML);

        if (!parseResult.status || !parseResult.data) {
          return ResponseUtil.error(
            parseResult.error || "Failed to parse DBML",
            400
          );
        }

        const dbmlText = dto.dbmlText || DEFAULT_DBML;
        const ast = dto.ast || parseResult.data.ast;
        const nodes = dto.nodes || [];
        const edges = dto.edges || [];
        const errors = dto.errors || parseResult.data.errors || [];
        const status = dto.status || (errors.length > 0 ? "error" : "idle");

        const diagram = await this.database.Diagram.create({
          userId,
          name: dto.name || "Untitled Diagram",
          description: dto.description || "",
          dbmlText,
          status,
          validationErrors: errors,
          setting: {
            modelJson: parseResult.data.modelJson,
            ast,
            layout: {
              nodes,
              edges,
            },
            preferences: {},
          },
        });

        const diagramObj = diagram.toObject();
        const result: any = {
          _id: diagramObj._id,
          dbmlText: diagramObj.dbmlText,
          status: diagramObj.status,
          errors: diagramObj.validationErrors || [],
          ast: diagramObj.setting?.ast || null,
          nodes: diagramObj.setting?.layout?.nodes || [],
          edges: diagramObj.setting?.layout?.edges || [],
        };

        return ResponseUtil.success(result);
      }
    } catch (error: any) {
      return ResponseUtil.error(
        error.message || "Failed to sync diagram",
        500
      );
    }
  }
}

