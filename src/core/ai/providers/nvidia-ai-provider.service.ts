import { Injectable } from "@nestjs/common";
import axios from "axios";
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

interface NvidiaStreamChoice {
  delta?: {
    content?: string;
  };
  message?: {
    content?: string;
  };
  text?: string;
}

interface NvidiaStreamChunk {
  choices?: NvidiaStreamChoice[];
}

@Injectable()
export class NvidiaAiProviderService implements AiProviderAdapter {
  readonly provider: AiProvider = "nvidia";

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
              const: true,
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
    if (!CONFIG.NVIDIA_API_KEY) {
      throw new AiProviderRequestError(
        "AI provider key is not configured",
        500
      );
    }

    const invokeUrl = `${CONFIG.NVIDIA_API_BASE_URL}/chat/completions`;
    const payload = {
      model: CONFIG.AI_MODEL,
      messages: request.messages,
      max_tokens: 16384,
      temperature: request.mode
        ? this.buildTemperature(request.mode)
        : CONFIG.AI_TEMPERATURE,
      top_p: CONFIG.AI_TOP_P,
      stream: true,
      response_format: request.responseFormat,
      chat_template_kwargs: {
        thinking: CONFIG.AI_ENABLE_THINKING,
      },
    };

    try {
      const response = await axios.post(invokeUrl, payload, {
        headers: {
          Authorization: `Bearer ${CONFIG.NVIDIA_API_KEY}`,
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        timeout: CONFIG.AI_REQUEST_TIMEOUT_MS,
        responseType: "stream",
      });

      return await new Promise<AiProviderStreamResult>((resolve, reject) => {
        let buffer = "";
        let fullText = "";

        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) {
            return;
          }

          const dataText = trimmed.slice(5).trim();
          if (!dataText || dataText === "[DONE]") {
            return;
          }

          try {
            const parsed = JSON.parse(dataText) as NvidiaStreamChunk;
            const choice = parsed.choices?.[0];
            const chunkText =
              choice?.delta?.content ?? choice?.message?.content ?? choice?.text;

            if (chunkText) {
              fullText += chunkText;
              onToken?.(chunkText);
            }
          } catch {
            // Keep stream resilient to malformed provider events.
          }
        };

        response.data.on("data", (chunk: Buffer | string) => {
          buffer += chunk.toString();
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || "";
          for (const line of lines) {
            processLine(line);
          }
        });

        response.data.on("end", () => {
          if (buffer) {
            processLine(buffer);
          }
          resolve({ text: fullText });
        });

        response.data.on("error", () => {
          reject(new AiProviderRequestError("AI stream failed", 502));
        });
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const providerError =
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message;

        throw new AiProviderRequestError(
          providerError || "Failed to call AI provider",
          statusCode
        );
      }

      throw new AiProviderRequestError("Failed to call AI provider", 500);
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
