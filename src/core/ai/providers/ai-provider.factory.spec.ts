import { AiProviderFactory } from "./ai-provider.factory";
import { GeminiAiProviderService } from "./gemini-ai-provider.service";
import { NvidiaAiProviderService } from "./nvidia-ai-provider.service";

describe("AiProviderFactory", () => {
  it("should resolve nvidia provider", () => {
    const nvidiaProvider = {
      provider: "nvidia",
    } as unknown as NvidiaAiProviderService;
    const geminiProvider = {
      provider: "gemini",
    } as unknown as GeminiAiProviderService;

    const factory = new AiProviderFactory(nvidiaProvider, geminiProvider);

    expect(factory.resolve("nvidia")).toBe(nvidiaProvider);
  });

  it("should resolve gemini provider", () => {
    const nvidiaProvider = {
      provider: "nvidia",
    } as unknown as NvidiaAiProviderService;
    const geminiProvider = {
      provider: "gemini",
    } as unknown as GeminiAiProviderService;

    const factory = new AiProviderFactory(nvidiaProvider, geminiProvider);

    expect(factory.resolve("gemini")).toBe(geminiProvider);
  });

  it("should throw for unsupported provider", () => {
    const nvidiaProvider = {
      provider: "nvidia",
    } as unknown as NvidiaAiProviderService;
    const geminiProvider = {
      provider: "gemini",
    } as unknown as GeminiAiProviderService;

    const factory = new AiProviderFactory(nvidiaProvider, geminiProvider);

    expect(() => factory.resolve("unknown" as any)).toThrow(
      "Unsupported AI provider"
    );
  });
});
