import { Injectable } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "@src/config";
import type {
  AiPromptTemplateContext,
  AiProvider,
  AiProviderAdapter,
  AiProviderStreamRequest,
  AiProviderStreamResult,
  AiResponseFormat,
  AiTemperatureMode,
} from "@src/core/ai/types/ai.types";
import { AiProviderRequestError } from "@src/core/ai/types/ai.types";
import type { ParseError } from "@src/types";

@Injectable()
export class GeminiAiProviderService implements AiProviderAdapter {
  readonly provider: AiProvider = "gemini";

  private get client(): GoogleGenAI {
    if (!CONFIG.GEMINI_API_KEY) {
      throw new AiProviderRequestError("Gemini API key is not configured", 500);
    }

    return new GoogleGenAI({
      apiKey: CONFIG.GEMINI_API_KEY,
    });
  }

  buildSystemPrompt(context: AiPromptTemplateContext): string {
    const diagramHeader = [context.name, context.description]
      .filter(Boolean)
      .join(" - ");

    const title = diagramHeader
      ? `Current diagram context: ${diagramHeader}.`
      : "Current diagram context: unnamed diagram.";

    return [
      "You are a database design assistant.",
      title,
      "Always return valid JSON object with exactly these keys: assistantMessage, dbmlText, shouldApply.",
      "assistantMessage must be concise and explain what changed.",
      "dbmlText must be complete DBML for the whole schema.",
      "shouldApply must always be true.",
      "Do not include markdown, code fences, or extra keys.",
    ].join(" ");
  }

  buildUserPrompt(context: AiPromptTemplateContext): string {
    const parseErrorText = this.buildParseErrorText(context.parseErrors);
    const previousResponse = context.previousResponse
      ? `Previous assistant response (invalid):\n${context.previousResponse}\n\n`
      : "";
    const previousDbml = context.previousDbml
      ? `Previously generated DBML (invalid):\n${context.previousDbml}\n\n`
      : "";

    return [
      "User request:",
      context.prompt,
      "",
      "Current DBML:",
      context.currentDbml,
      "",
      previousResponse,
      previousDbml,
      parseErrorText,
    ]
      .filter(Boolean)
      .join("\n");
  }

  buildResponseFormat(): AiResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name: "dbml_assistant_response",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            assistantMessage: {
              type: "string",
            },
            dbmlText: {
              type: "string",
            },
            shouldApply: {
              type: "boolean",
              enum: [true],
            },
          },
          required: ["assistantMessage", "dbmlText", "shouldApply"],
        },
      },
    };
  }

  buildTemperature(mode: AiTemperatureMode): number {
    return mode === "repair"
      ? CONFIG.AI_REPAIR_TEMPERATURE
      : CONFIG.AI_TEMPERATURE;
  }

  async streamCompletion(
    request: AiProviderStreamRequest,
    onToken?: (chunk: string) => void
  ): Promise<AiProviderStreamResult> {
    try {
      const [systemMessage, ...conversationMessages] = request.messages;

      const contents = conversationMessages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

      const stream = await this.client.models.generateContentStream({
        model: CONFIG.GEMINI_MODEL,
        contents,
        config: {
          systemInstruction:
            systemMessage?.role === "system" ? systemMessage.content : undefined,
          temperature: this.buildTemperature(request.mode),
          topP: CONFIG.AI_TOP_P,
          responseMimeType: "application/json",
        },
      });

      let fullText = "";

      for await (const chunk of stream) {
        const chunkText = typeof chunk.text === "string" ? chunk.text : "";
        if (!chunkText) {
          continue;
        }

        fullText += chunkText;
        onToken?.(chunkText);
      }

      return {
        text: fullText,
      };
    } catch (error: any) {
      const statusCode = Number(error?.status) || Number(error?.code) || undefined;
      const providerMessage =
        error?.message || error?.error?.message || "Failed to call Gemini provider";

      throw new AiProviderRequestError(providerMessage, statusCode);
    }
  }

  private buildParseErrorText(parseErrors?: ParseError[]): string {
    if (!parseErrors || parseErrors.length === 0) {
      return "";
    }

    const serialized = parseErrors
      .map((error) => {
        const location =
          error.column !== undefined
            ? `${error.line}:${error.column}`
            : `${error.line}`;
        return `- [${error.type}] at ${location}: ${error.message}`;
      })
      .join("\n");

    return `Current parse/validation errors to fix:\n${serialized}`;
  }
}
