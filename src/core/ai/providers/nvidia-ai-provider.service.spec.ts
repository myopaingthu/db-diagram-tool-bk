import { CONFIG } from "../../../config";
import { NvidiaAiProviderService } from "./nvidia-ai-provider.service";

describe("NvidiaAiProviderService", () => {
  const service = new NvidiaAiProviderService();

  it("should build response format with expected schema", () => {
    const format = service.buildResponseFormat();

    expect(format.type).toBe("json_schema");
    expect(format.json_schema.name).toBe("dbml_assistant_response");
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema).toEqual(
      expect.objectContaining({
        type: "object",
      })
    );
  });

  it("should select temperatures by mode", () => {
    expect(service.buildTemperature("default")).toBe(CONFIG.AI_TEMPERATURE);
    expect(service.buildTemperature("repair")).toBe(
      CONFIG.AI_REPAIR_TEMPERATURE
    );
  });

  it("should include parse errors in repair prompt", () => {
    const prompt = service.buildUserPrompt({
      prompt: "Fix schema",
      currentDbml: "Table users { id int [pk] }",
      parseErrors: [
        {
          line: 2,
          column: 4,
          message: "Invalid token",
          type: "syntax",
        },
      ],
    });

    expect(prompt).toContain("Current parse/validation errors to fix");
    expect(prompt).toContain("Invalid token");
  });
});
