import { AiOrchestrationService } from "./ai-orchestration.service";
import type { AiProviderAdapter } from "./types/ai.types";

describe("AiOrchestrationService", () => {
  const createService = () => {
    const provider: AiProviderAdapter = {
      provider: "nvidia",
      buildSystemPrompt: jest.fn().mockReturnValue("system"),
      buildUserPrompt: jest.fn().mockReturnValue("user"),
      buildResponseFormat: jest.fn().mockReturnValue({
        type: "json_schema",
        json_schema: {
          name: "test",
          strict: true,
          schema: {},
        },
      }),
      buildTemperature: jest.fn().mockReturnValue(0.2),
      streamCompletion: jest.fn(),
    };

    const providerFactory = {
      resolve: jest.fn().mockReturnValue(provider),
    };

    const parserService = {
      parse: jest.fn(),
    };

    const diagramService = {
      sync: jest.fn(),
    };

    const aiChatService = {
      ensureDiagramOwnership: jest.fn(),
      getContextMessages: jest.fn().mockResolvedValue([]),
      persistUserMessage: jest.fn().mockResolvedValue(undefined),
      persistAssistantMessage: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AiOrchestrationService(
      providerFactory as any,
      parserService as any,
      diagramService as any,
      aiChatService as any
    );

    return {
      service,
      provider,
      providerFactory,
      parserService,
      diagramService,
      aiChatService,
    };
  };

  it("should process prompt for existing diagram with valid DBML", async () => {
    const {
      service,
      provider,
      parserService,
      aiChatService,
    } = createService();

    (provider.streamCompletion as jest.Mock).mockResolvedValue({
      text: JSON.stringify({
        assistantMessage: "Updated users table",
        dbmlText: "Table users { id int [pk] }",
        shouldApply: true,
      }),
    });

    (aiChatService.ensureDiagramOwnership as jest.Mock).mockResolvedValue({
      _id: "diagram-1",
    });

    (parserService.parse as jest.Mock).mockResolvedValue({
      status: true,
      data: {
        errors: [],
      },
    });

    const done = await service.processPrompt({
      userId: "user-1",
      diagramId: "diagram-1",
      prompt: "Add users table",
      currentDbml: "Table users { id int [pk] }",
    });

    expect(done.valid).toBe(true);
    expect(done.diagramId).toBe("diagram-1");
    expect(done.dbmlText).toContain("Table users");
    expect(aiChatService.persistUserMessage).toHaveBeenCalledTimes(1);
    expect(aiChatService.persistAssistantMessage).toHaveBeenCalledTimes(1);
    expect(provider.streamCompletion).toHaveBeenCalledTimes(1);
  });

  it("should attempt one repair pass when initial DBML is invalid", async () => {
    const {
      service,
      provider,
      parserService,
      aiChatService,
    } = createService();

    (provider.streamCompletion as jest.Mock)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          assistantMessage: "Initial response",
          dbmlText: "Table broken {",
          shouldApply: true,
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          assistantMessage: "Repaired response",
          dbmlText: "Table users { id int [pk] }",
          shouldApply: true,
        }),
      });

    (aiChatService.ensureDiagramOwnership as jest.Mock).mockResolvedValue({
      _id: "diagram-2",
    });

    (parserService.parse as jest.Mock)
      .mockResolvedValueOnce({
        status: false,
        error: "Unexpected token",
      })
      .mockResolvedValueOnce({
        status: true,
        data: {
          errors: [],
        },
      });

    const done = await service.processPrompt({
      userId: "user-2",
      diagramId: "diagram-2",
      prompt: "Fix it",
      currentDbml: "Table users { id int [pk] }",
    });

    expect(done.valid).toBe(true);
    expect(done.dbmlText).toContain("Table users");
    expect(provider.streamCompletion).toHaveBeenCalledTimes(2);
    expect(aiChatService.persistAssistantMessage).toHaveBeenCalledTimes(1);
  });

  it("should create diagram automatically when diagramId is missing", async () => {
    const {
      service,
      provider,
      parserService,
      diagramService,
      aiChatService,
    } = createService();

    (provider.streamCompletion as jest.Mock).mockResolvedValue({
      text: JSON.stringify({
        assistantMessage: "Created schema",
        dbmlText: "Table users { id int [pk] }",
        shouldApply: true,
      }),
    });

    (diagramService.sync as jest.Mock).mockResolvedValue({
      status: true,
      data: {
        _id: "diagram-new",
      },
    });

    (parserService.parse as jest.Mock).mockResolvedValue({
      status: true,
      data: {
        errors: [],
      },
    });

    const done = await service.processPrompt({
      userId: "user-3",
      prompt: "Create user and post tables",
      currentDbml: "Table users { id int [pk] }",
      name: "New Diagram",
    });

    expect(done.diagramId).toBe("diagram-new");
    expect(done.valid).toBe(true);
    expect(aiChatService.ensureDiagramOwnership).not.toHaveBeenCalled();
    expect(diagramService.sync).toHaveBeenCalledTimes(1);
  });
});
