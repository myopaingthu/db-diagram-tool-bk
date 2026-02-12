import { Module } from "@nestjs/common";
import { DatabaseModule } from "@src/database/database.module";
import { DiagramModule } from "@src/core/diagram/diagram.module";
import { ParserModule } from "@src/core/parser/parser.module";
import { AiController } from "@src/core/ai/ai.controller";
import { AiChatService } from "@src/core/ai/ai-chat.service";
import { AiOrchestrationService } from "@src/core/ai/ai-orchestration.service";
import { AiProviderFactory } from "@src/core/ai/providers/ai-provider.factory";
import { NvidiaAiProviderService } from "@src/core/ai/providers/nvidia-ai-provider.service";
import { GeminiAiProviderService } from "@src/core/ai/providers/gemini-ai-provider.service";

@Module({
  imports: [DatabaseModule, DiagramModule, ParserModule],
  controllers: [AiController],
  providers: [
    AiChatService,
    AiOrchestrationService,
    AiProviderFactory,
    NvidiaAiProviderService,
    GeminiAiProviderService,
  ],
  exports: [AiChatService, AiOrchestrationService],
})
export class AiModule {}
