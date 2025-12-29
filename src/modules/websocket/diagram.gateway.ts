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
import { JwtService } from "@nestjs/jwt";
import { CONFIG } from "@src/config";
import { Logger } from "@nestjs/common";

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
    private readonly jwtService: JwtService
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
}

