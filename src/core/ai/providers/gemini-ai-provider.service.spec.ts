import { CONFIG } from "../../../config";
import { GeminiAiProviderService } from "./gemini-ai-provider.service";

describe("GeminiAiProviderService", () => {
  const service = new GeminiAiProviderService();

  it("should build response format", () => {
    const format = service.buildResponseFormat();

    expect(format.type).toBe("json_schema");
    expect(format.json_schema.name).toBe("dbml_assistant_response");
    expect(format.json_schema.strict).toBe(true);
  });

  it("should select temperatures by mode", () => {
    expect(service.buildTemperature("default")).toBe(CONFIG.AI_TEMPERATURE);
    expect(service.buildTemperature("repair")).toBe(
      CONFIG.AI_REPAIR_TEMPERATURE
    );
  });

  it("should include parse errors in prompt", () => {
    const prompt = service.buildUserPrompt({
      prompt: "Fix schema",
      currentDbml: "Table users { id int [pk] }",
      parseErrors: [
        {
          line: 3,
          column: 1,
          message: "Missing bracket",
          type: "syntax",
        },
      ],
    });

    expect(prompt).toContain("Current parse/validation errors to fix");
    expect(prompt).toContain("Missing bracket");
  });
});
