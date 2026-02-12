import { Injectable, Logger } from "@nestjs/common";
import { Types } from "mongoose";
import { CONFIG } from "@src/config";
import { DatabaseService } from "@src/database/database.service";
import type {
  AiContextMessage,
  AiProvider,
  AiStoredMessage,
  AiStoredMessageRole,
} from "@src/core/ai/types/ai.types";
import type { ParseError } from "@src/types";

interface PersistUserMessageInput {
  diagramId: string;
  userId: string;
  content: string;
  requestId: string;
  provider: AiProvider;
  model: string;
}

interface PersistAssistantMessageInput {
  diagramId: string;
  userId: string;
  content: string;
  generatedDbml?: string;
  validDbml?: boolean;
  parseErrors?: ParseError[];
  requestId: string;
  provider: AiProvider;
  model: string;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(private readonly database: DatabaseService) {}

  async ensureDiagramOwnership(diagramId: string, userId: string): Promise<any | null> {
    if (!Types.ObjectId.isValid(diagramId)) {
      return null;
    }

    return this.database.Diagram.findOne({
      _id: diagramId,
      userId,
      deletedAt: null,
    }).exec();
  }

  async getMessages(
    diagramId: string,
    userId: string,
    limit: number
  ): Promise<AiStoredMessage[] | null> {
    const diagram = await this.ensureDiagramOwnership(diagramId, userId);
    if (!diagram) {
      return null;
    }

    const clampedLimit = Math.min(Math.max(limit, 1), 100);

    const records = await this.database.DiagramAiMessage.find({
      diagramId,
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(clampedLimit)
      .lean()
      .exec();

    return records.reverse().map((record: any) => ({
      _id: String(record._id),
      diagramId: String(record.diagramId),
      userId: String(record.userId),
      role: record.role as AiStoredMessageRole,
      content: record.content,
      generatedDbml: record.generatedDbml || undefined,
      validDbml:
        typeof record.validDbml === "boolean" ? record.validDbml : undefined,
      parseErrors: Array.isArray(record.parseErrors) ? record.parseErrors : [],
      requestId: record.requestId,
      provider: record.provider as AiProvider,
      model: record.model,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: new Date(record.updatedAt).toISOString(),
    }));
  }

  async clearMessages(diagramId: string, userId: string): Promise<boolean> {
    const diagram = await this.ensureDiagramOwnership(diagramId, userId);
    if (!diagram) {
      return false;
    }

    await this.database.DiagramAiMessage.deleteMany({
      diagramId,
      userId,
    }).exec();

    this.logger.log(`Cleared AI messages for diagram=${diagramId} user=${userId}`);
    return true;
  }

  async getContextMessages(
    diagramId: string,
    userId: string,
    limit: number = CONFIG.AI_CHAT_MAX_MESSAGES
  ): Promise<AiContextMessage[]> {
    const records = await this.database.DiagramAiMessage.find({
      diagramId,
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return records.reverse().map((record: any) => ({
      role: record.role as AiStoredMessageRole,
      content: record.content,
      generatedDbml: record.generatedDbml || undefined,
    }));
  }

  async persistUserMessage(input: PersistUserMessageInput): Promise<void> {
    await this.database.DiagramAiMessage.create({
      diagramId: input.diagramId,
      userId: input.userId,
      role: "user",
      content: input.content,
      requestId: input.requestId,
      provider: input.provider,
      model: input.model,
    });

    await this.pruneMessages(input.diagramId, input.userId);
  }

  async persistAssistantMessage(input: PersistAssistantMessageInput): Promise<void> {
    await this.database.DiagramAiMessage.create({
      diagramId: input.diagramId,
      userId: input.userId,
      role: "assistant",
      content: input.content,
      generatedDbml: input.generatedDbml || null,
      validDbml:
        typeof input.validDbml === "boolean" ? input.validDbml : null,
      parseErrors: input.parseErrors || [],
      requestId: input.requestId,
      provider: input.provider,
      model: input.model,
    });

    await this.pruneMessages(input.diagramId, input.userId);
  }

  private async pruneMessages(diagramId: string, userId: string): Promise<void> {
    const totalCount = await this.database.DiagramAiMessage.countDocuments({
      diagramId,
      userId,
    }).exec();

    const overflow = totalCount - CONFIG.AI_CHAT_MAX_MESSAGES;
    if (overflow <= 0) {
      return;
    }

    const staleRecords = await this.database.DiagramAiMessage.find({
      diagramId,
      userId,
    })
      .sort({ createdAt: 1 })
      .limit(overflow)
      .select({ _id: 1 })
      .lean()
      .exec();

    const staleIds = staleRecords.map((record: any) => record._id);
    if (staleIds.length === 0) {
      return;
    }

    await this.database.DiagramAiMessage.deleteMany({
      _id: { $in: staleIds },
    }).exec();
  }
}
