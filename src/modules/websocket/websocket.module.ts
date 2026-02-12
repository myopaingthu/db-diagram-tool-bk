import { Module } from "@nestjs/common";
import { DiagramGateway } from "./diagram.gateway";
import { ParserModule } from "@src/core/parser/parser.module";
import { AuthModule } from "@src/core/auth/auth.module";
import { AiModule } from "@src/core/ai/ai.module";

@Module({
  imports: [ParserModule, AuthModule, AiModule],
  providers: [DiagramGateway],
})
export class WebSocketModule {}
