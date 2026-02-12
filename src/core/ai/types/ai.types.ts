import type { ParseError } from "@src/types";

export type AiProvider = "nvidia" | "gemini";
export type AiTemperatureMode = "default" | "repair";
export type AiRole = "system" | "user" | "assistant";
export type AiStoredMessageRole = "user" | "assistant";

export interface AiPromptPayload {
  diagramId?: string;
  prompt: string;
  currentDbml: string;
  name?: string;
  description?: string;
}

export interface AiPromptInput extends AiPromptPayload {
  userId: string;
}

export interface AiPromptTemplateContext {
  prompt: string;
  currentDbml: string;
  name?: string;
  description?: string;
  parseErrors?: ParseError[];
  previousResponse?: string;
  previousDbml?: string;
}

export interface AiProviderMessage {
  role: AiRole;
  content: string;
}

export interface AiResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

export interface AiProviderStreamRequest {
  messages: AiProviderMessage[];
  mode: AiTemperatureMode;
  responseFormat?: AiResponseFormat;
}

export interface AiProviderStreamResult {
  text: string;
}

export interface AiProviderAdapter {
  provider: AiProvider;
  buildSystemPrompt(context: AiPromptTemplateContext): string;
  buildUserPrompt(context: AiPromptTemplateContext): string;
  buildResponseFormat(): AiResponseFormat;
  buildTemperature(mode: AiTemperatureMode): number;
  streamCompletion(
    request: AiProviderStreamRequest,
    onToken?: (chunk: string) => void
  ): Promise<AiProviderStreamResult>;
}

export interface AiStructuredResponse {
  assistantMessage: string;
  dbmlText: string;
  shouldApply: boolean;
}

export interface AiSessionPayload {
  diagramId: string;
  requestId: string;
}

export interface AiTokenPayload {
  requestId: string;
  chunk: string;
}

export interface AiDonePayload {
  requestId: string;
  diagramId: string;
  assistantMessage: string;
  dbmlText?: string;
  valid: boolean;
  errors?: ParseError[];
}

export interface AiStoredMessage {
  _id: string;
  diagramId: string;
  userId: string;
  role: AiStoredMessageRole;
  content: string;
  generatedDbml?: string;
  validDbml?: boolean;
  parseErrors?: ParseError[];
  requestId: string;
  provider: AiProvider;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiContextMessage {
  role: AiStoredMessageRole;
  content: string;
  generatedDbml?: string;
}

export class AiProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "AiProviderRequestError";
  }
}

export class AiOrchestrationError extends Error {
  constructor(
    message: string,
    public readonly requestId: string
  ) {
    super(message);
    this.name = "AiOrchestrationError";
  }
}
