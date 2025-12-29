import { Module } from "@nestjs/common";
import { DiagramGateway } from "./diagram.gateway";
import { ParserModule } from "@src/core/parser/parser.module";
import { JwtModule } from "@nestjs/jwt";
import { CONFIG } from "@src/config";

@Module({
  imports: [
    ParserModule,
    JwtModule.register({
      secret: CONFIG.JWT_SECRET,
    }),
  ],
  providers: [DiagramGateway],
})
export class WebSocketModule {}

