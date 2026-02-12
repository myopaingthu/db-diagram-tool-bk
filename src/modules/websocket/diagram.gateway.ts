import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ParserService } from "@src/core/parser/parser.service";
import { DbmlConverterService } from "@src/core/parser/dbml-converter.service";
import { JwtService } from "@nestjs/jwt";
import { CONFIG } from "@src/config";
import { Logger } from "@nestjs/common";
import type { SchemaAST, ParseError } from "@src/types";
import { AiOrchestrationService } from "@src/core/ai/ai-orchestration.service";
import { AiPromptDto } from "@src/core/ai/dto/ai.dto";
import { AiOrchestrationError } from "@src/core/ai/types/ai.types";

@WebSocketGateway({
  cors: {
    origin: CONFIG.CORS_ORIGIN ? CONFIG.CORS_ORIGIN.split(",") : [],
  },
  namespace: "/",
})
export class DiagramGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger: Logger;
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly parserService: ParserService,
    private readonly dbmlConverter: DbmlConverterService,
    private readonly jwtService: JwtService,
    private readonly aiOrchestrationService: AiOrchestrationService
  ) {
    this.logger = new Logger(DiagramGateway.name);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: CONFIG.JWT_SECRET,
      });

      (client as any).userId = payload.userId;
      this.logger.log(`Client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      this.logger.error("WebSocket authentication error:", error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("diagram:parse")
  async handleParse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dbmlText: string }
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) {
        client.emit("diagram:error", {
          message: "Unauthorized",
        });
        return;
      }

      const parseResult = await this.parserService.parse(data.dbmlText);

      if (!parseResult.status || !parseResult.data) {
        client.emit("diagram:error", {
          message: parseResult.error || "Failed to parse DBML",
        });
        return;
      }

      client.emit("diagram:parsed", {
        ast: parseResult.data.ast,
        errors: parseResult.data.errors,
      });
    } catch (error: any) {
      client.emit("diagram:error", {
        message: error.message || "An error occurred",
      });
    }
  }

  @SubscribeMessage("diagram:update-ast")
  async handleUpdateAst(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ast: SchemaAST }
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) {
        client.emit("diagram:error", {
          message: "Unauthorized",
        });
        return;
      }

      const dbmlText = this.dbmlConverter.convertToDbml(data.ast);

      const parseResult = await this.parserService.parse(dbmlText);

      const errors: ParseError[] = parseResult.status && parseResult.data
        ? parseResult.data.errors
        : [
            {
              line: 0,
              message: parseResult.error || "Failed to validate AST",
              type: "validation",
            },
          ];

      client.emit("diagram:ast-updated", {
        ast: data.ast,
        dbmlText: dbmlText,
        errors: errors,
      });
    } catch (error: any) {
      this.logger.error("Error converting AST to DBML:", error);
      client.emit("diagram:error", {
        message: error.message || "An error occurred during AST update",
      });
    }
  }

  @SubscribeMessage("ai:prompt")
  async handleAiPrompt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AiPromptDto
  ) {
    try {
      const userId = (client as any).userId as string | undefined;
      if (!userId) {
        client.emit("ai:error", {
          message: "Unauthorized",
        });
        return;
      }

      const result = await this.aiOrchestrationService.processPrompt(
        {
          userId,
          diagramId: data.diagramId,
          prompt: data.prompt,
          currentDbml: data.currentDbml,
          name: data.name,
          description: data.description,
        },
        {
          onSession: (payload) => {
            client.emit("ai:session", payload);
          },
          onToken: (payload) => {
            client.emit("ai:token", payload);
          },
        }
      );

      client.emit("ai:done", result);
    } catch (error: any) {
      const requestId =
        error instanceof AiOrchestrationError ? error.requestId : undefined;
      client.emit("ai:error", {
        requestId,
        message: error.message || "Failed to process AI prompt",
      });
    }
  }
}
