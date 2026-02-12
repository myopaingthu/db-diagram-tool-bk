import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CONFIG } from "@src/config";
import { DEFAULT_DBML } from "@src/constants";
import { DiagramService } from "@src/core/diagram/diagram.service";
import { ParserService } from "@src/core/parser/parser.service";
import { AiChatService } from "@src/core/ai/ai-chat.service";
import { AiProviderFactory } from "@src/core/ai/providers/ai-provider.factory";
import {
  AiOrchestrationError,
  AiProviderRequestError,
  type AiContextMessage,
  type AiDonePayload,
  type AiPromptInput,
  type AiPromptTemplateContext,
  type AiProviderMessage,
  type AiSessionPayload,
  type AiStructuredResponse,
  type AiTokenPayload,
} from "@src/core/ai/types/ai.types";
import type { ParseError } from "@src/types";

interface StreamHandlers {
  onSession?: (payload: AiSessionPayload) => void;
  onToken?: (payload: AiTokenPayload) => void;
}

interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
}

@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);
  private readonly maxPromptChars = 4000;
  private readonly maxDbmlChars = 200000;

  constructor(
    private readonly providerFactory: AiProviderFactory,
    private readonly parserService: ParserService,
    private readonly diagramService: DiagramService,
    private readonly aiChatService: AiChatService
  ) {}

  async processPrompt(
    input: AiPromptInput,
    handlers: StreamHandlers = {}
  ): Promise<AiDonePayload> {
    this.validatePromptInput(input);

    const startedAt = Date.now();
    const provider = this.providerFactory.resolve();
    const providerModel = this.getProviderModel(provider.provider);
    const requestId = randomUUID();
    const wasCreated = !input.diagramId;
    const diagramId = await this.resolveDiagramId(input);

    handlers.onSession?.({ diagramId, requestId });

    const contextMessages = await this.aiChatService.getContextMessages(
      diagramId,
      input.userId,
      CONFIG.AI_CHAT_MAX_MESSAGES
    );

    await this.aiChatService.persistUserMessage({
      diagramId,
      userId: input.userId,
      content: input.prompt.trim(),
      requestId,
      provider: provider.provider,
      model: providerModel,
    });

    this.auditLog("ai_request_start", {
      requestId,
      userId: input.userId,
      diagramId,
      provider: provider.provider,
      model: providerModel,
      promptLength: input.prompt.trim().length,
      dbmlLength: input.currentDbml.length,
      nameLength: input.name?.length || 0,
      descriptionLength: input.description?.length || 0,
      wasCreated,
    });

    try {
      const responseFormat = provider.buildResponseFormat();
      const defaultContext: AiPromptTemplateContext = {
        prompt: input.prompt.trim(),
        currentDbml: input.currentDbml,
        name: input.name,
        description: input.description,
      };

      const systemPrompt = provider.buildSystemPrompt(defaultContext);
      const userPrompt = provider.buildUserPrompt(defaultContext);

      const defaultMessages = this.buildProviderMessages(
        systemPrompt,
        contextMessages,
        userPrompt
      );

      const completion = await provider.streamCompletion(
        {
          messages: defaultMessages,
          mode: "default",
          responseFormat,
        },
        (chunk: string) => {
          handlers.onToken?.({ requestId, chunk });
        }
      );

      let parsedResponse = this.parseStructuredResponse(completion.text);
      let validation = await this.validateDbml(parsedResponse.dbmlText);

      let repairAttempted = false;
      if (!validation.valid) {
        repairAttempted = true;
        const repairContext: AiPromptTemplateContext = {
          prompt:
            "Repair the DBML so it parses and validates while preserving the user intent.",
          currentDbml: input.currentDbml,
          name: input.name,
          description: input.description,
          parseErrors: validation.errors,
          previousResponse: parsedResponse.assistantMessage,
          previousDbml: parsedResponse.dbmlText,
        };

        const repairSystemPrompt = provider.buildSystemPrompt(repairContext);
        const repairUserPrompt = provider.buildUserPrompt(repairContext);
        const repairMessages = this.buildProviderMessages(
          repairSystemPrompt,
          contextMessages,
          repairUserPrompt
        );

        const repairCompletion = await provider.streamCompletion(
          {
            messages: repairMessages,
            mode: "repair",
            responseFormat,
          },
          undefined
        );

        parsedResponse = this.parseStructuredResponse(repairCompletion.text);
        validation = await this.validateDbml(parsedResponse.dbmlText);
      }

      const donePayload: AiDonePayload = {
        requestId,
        diagramId,
        assistantMessage: parsedResponse.assistantMessage,
        dbmlText:
          validation.valid && parsedResponse.shouldApply
            ? parsedResponse.dbmlText
            : undefined,
        valid: validation.valid && parsedResponse.shouldApply,
        errors: validation.valid ? [] : validation.errors,
      };

      await this.aiChatService.persistAssistantMessage({
        diagramId,
        userId: input.userId,
        content: parsedResponse.assistantMessage,
        generatedDbml: parsedResponse.dbmlText || undefined,
        validDbml: donePayload.valid,
        parseErrors: donePayload.errors,
        requestId,
        provider: provider.provider,
        model: providerModel,
      });

      this.auditLog("ai_request_end", {
        requestId,
        userId: input.userId,
        diagramId,
        provider: provider.provider,
        model: providerModel,
        durationMs: Date.now() - startedAt,
        valid: donePayload.valid,
        errorsCount: donePayload.errors?.length || 0,
        assistantMessageLength: parsedResponse.assistantMessage.length,
        dbmlLength: parsedResponse.dbmlText.length,
        repairAttempted,
      });

      return donePayload;
    } catch (error: any) {
      const message = this.mapProviderError(error);
      this.auditLog("ai_request_error", {
        requestId,
        userId: input.userId,
        diagramId,
        provider: provider.provider,
        model: providerModel,
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      }, true);
      throw new AiOrchestrationError(message, requestId);
    }
  }

  private validatePromptInput(input: AiPromptInput): void {
    if (!input.prompt || typeof input.prompt !== "string") {
      throw new Error("Prompt is required");
    }

    const trimmedPrompt = input.prompt.trim();
    if (!trimmedPrompt) {
      throw new Error("Prompt cannot be empty");
    }

    if (trimmedPrompt.length > this.maxPromptChars) {
      throw new Error(`Prompt cannot exceed ${this.maxPromptChars} characters`);
    }

    if (!input.currentDbml || typeof input.currentDbml !== "string") {
      throw new Error("Current DBML is required");
    }

    if (input.currentDbml.length > this.maxDbmlChars) {
      throw new Error(`Current DBML cannot exceed ${this.maxDbmlChars} characters`);
    }
  }

  private async resolveDiagramId(input: AiPromptInput): Promise<string> {
    if (input.diagramId) {
      const diagram = await this.aiChatService.ensureDiagramOwnership(
        input.diagramId,
        input.userId
      );

      if (!diagram) {
        throw new Error("Diagram not found");
      }

      return String(diagram._id);
    }

    const createResult = await this.createDiagramFromCurrentState(input);
    if (!createResult) {
      throw new Error("Failed to create diagram for AI session");
    }

    return createResult;
  }

  private async createDiagramFromCurrentState(
    input: AiPromptInput
  ): Promise<string | null> {
    const payload = {
      dbmlText: input.currentDbml || DEFAULT_DBML,
      name: input.name || "Untitled Diagram",
      description: input.description || "",
    };

    let result = await this.diagramService.sync(input.userId, undefined, payload);

    if ((!result.status || !result.data) && payload.dbmlText !== DEFAULT_DBML) {
      result = await this.diagramService.sync(input.userId, undefined, {
        ...payload,
        dbmlText: DEFAULT_DBML,
      });
    }

    if (!result.status || !result.data) {
      return null;
    }

    const data = result.data as { _id?: string };
    if (!data._id) {
      return null;
    }

    return String(data._id);
  }

  private buildProviderMessages(
    systemPrompt: string,
    contextMessages: AiContextMessage[],
    userPrompt: string
  ): AiProviderMessage[] {
    const messages: AiProviderMessage[] = [{
      role: "system",
      content: systemPrompt,
    }];

    for (const message of contextMessages) {
      if (message.role === "assistant") {
        const assistantContent = message.generatedDbml
          ? `${message.content}\n\nGenerated DBML:\n${message.generatedDbml}`
          : message.content;

        messages.push({
          role: "assistant",
          content: assistantContent,
        });
      } else {
        messages.push({
          role: "user",
          content: message.content,
        });
      }
    }

    messages.push({ role: "user", content: userPrompt });

    return messages;
  }

  private parseStructuredResponse(rawText: string): AiStructuredResponse {
    const trimmed = rawText.trim();
    const parsed =
      this.tryParseJsonObject(trimmed) ||
      this.tryParseJsonObject(this.extractJsonObject(trimmed));

    if (parsed) {
      const assistantMessage =
        typeof parsed.assistantMessage === "string"
          ? parsed.assistantMessage.trim()
          : "Schema updated based on your request.";
      const dbmlText =
        typeof parsed.dbmlText === "string" ? parsed.dbmlText.trim() : "";
      const shouldApply = parsed.shouldApply !== false;

      return {
        assistantMessage,
        dbmlText,
        shouldApply,
      };
    }

    const fallbackDbml = this.extractDbmlFromText(trimmed);

    return {
      assistantMessage: trimmed || "Schema updated based on your request.",
      dbmlText: fallbackDbml,
      shouldApply: true,
    };
  }

  private tryParseJsonObject(
    value: string
  ): Record<string, string | boolean> | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as Record<string, string | boolean>;
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private extractJsonObject(value: string): string {
    if (!value) {
      return "";
    }

    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return "";
    }

    return value.slice(start, end + 1);
  }

  private extractDbmlFromText(value: string): string {
    if (!value) {
      return "";
    }

    const fenceMatch = value.match(/```(?:dbml)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim();
    }

    const tableIndex = value.indexOf("Table ");
    if (tableIndex >= 0) {
      return value.slice(tableIndex).trim();
    }

    return "";
  }

  private async validateDbml(dbmlText: string): Promise<ValidationResult> {
    if (!dbmlText || !dbmlText.trim()) {
      return {
        valid: false,
        errors: [
          {
            line: 0,
            message: "AI response did not include DBML",
            type: "validation",
          },
        ],
      };
    }

    const parseResult = await this.parserService.parse(dbmlText);

    if (!parseResult.status || !parseResult.data) {
      return {
        valid: false,
        errors: [
          {
            line: 0,
            message: parseResult.error || "Failed to parse DBML",
            type: "syntax",
          },
        ],
      };
    }

    const parseErrors = parseResult.data.errors || [];
    return {
      valid: parseErrors.length === 0,
      errors: parseErrors,
    };
  }

  private mapProviderError(error: any): string {
    if (error instanceof AiProviderRequestError) {
      if (error.statusCode === 429) {
        return "AI provider rate limit reached. Please retry in a moment.";
      }

      if (error.statusCode && error.statusCode >= 500) {
        return "AI provider is temporarily unavailable. Please retry.";
      }

      return error.message || "Failed to process AI request";
    }

    return error?.message || "Failed to process AI request";
  }

  private auditLog(
    event: "ai_request_start" | "ai_request_end" | "ai_request_error",
    data: Record<string, unknown>,
    isError = false
  ): void {
    const payload = JSON.stringify({
      event,
      ...data,
    });

    if (isError) {
      this.logger.error(payload);
    } else {
      this.logger.log(payload);
    }
  }

  private getProviderModel(provider: string): string {
    if (provider === "gemini") {
      return CONFIG.GEMINI_MODEL;
    }

    return CONFIG.AI_MODEL;
  }
}
