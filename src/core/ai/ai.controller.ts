import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AiChatService } from "@src/core/ai/ai-chat.service";
import { JwtAuthGuard } from "@src/core/auth/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "@src/core/auth/interfaces/authenticated-request.interface";
import { CONFIG } from "@src/config";
import { ResponseUtil } from "@src/shared/util/response.util";
import type { ApiResponse } from "@src/types";
import type { AiStoredMessage } from "@src/core/ai/types/ai.types";
import { AiMessagesQueryDto } from "@src/core/ai/dto/ai.dto";

@Controller("api/core/diagrams/:id/ai/messages")
export class AiController {
  constructor(private readonly aiChatService: AiChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMessages(
    @Param("id") diagramId: string,
    @Request() req: AuthenticatedRequest,
    @Query() query: AiMessagesQueryDto
  ): Promise<ApiResponse<AiStoredMessage[]>> {
    try {
      const limit = query.limit || CONFIG.AI_CHAT_MAX_MESSAGES;
      const messages = await this.aiChatService.getMessages(
        diagramId,
        req.user.userId,
        limit
      );

      if (!messages) {
        return ResponseUtil.error("Diagram not found", 404);
      }

      return ResponseUtil.success(messages);
    } catch (error: any) {
      return ResponseUtil.error(error.message || "Failed to fetch AI messages", 500);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async clearMessages(
    @Param("id") diagramId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<boolean>> {
    try {
      const cleared = await this.aiChatService.clearMessages(
        diagramId,
        req.user.userId
      );

      if (!cleared) {
        return ResponseUtil.error("Diagram not found", 404);
      }

      return ResponseUtil.success(true);
    } catch (error: any) {
      return ResponseUtil.error(error.message || "Failed to clear AI messages", 500);
    }
  }
}
