import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "@src/database/database.module";
import { AuthModule } from "@src/core/auth/auth.module";
import { ParserModule } from "@src/core/parser/parser.module";
import { DiagramModule } from "@src/core/diagram/diagram.module";
import { WebSocketModule } from "@src/modules/websocket/websocket.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ParserModule,
    DiagramModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
