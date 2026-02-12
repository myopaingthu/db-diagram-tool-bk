import { Injectable } from "@nestjs/common";
import { CONFIG } from "@src/config";
import type { AiProvider, AiProviderAdapter } from "@src/core/ai/types/ai.types";
import { NvidiaAiProviderService } from "@src/core/ai/providers/nvidia-ai-provider.service";
import { GeminiAiProviderService } from "@src/core/ai/providers/gemini-ai-provider.service";

@Injectable()
export class AiProviderFactory {
  constructor(
    private readonly nvidiaProvider: NvidiaAiProviderService,
    private readonly geminiProvider: GeminiAiProviderService
  ) {}

  resolve(provider: AiProvider = CONFIG.AI_PROVIDER): AiProviderAdapter {
    switch (provider) {
      case "nvidia":
        return this.nvidiaProvider;
      case "gemini":
        return this.geminiProvider;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}
