import { Module } from "@nestjs/common";
import { DiagramService } from "./diagram.service";
import { DiagramController } from "./diagram.controller";
import { DatabaseModule } from "@src/database/database.module";
import { ParserModule } from "@src/core/parser/parser.module";

@Module({
  imports: [DatabaseModule, ParserModule],
  controllers: [DiagramController],
  providers: [DiagramService],
  exports: [DiagramService],
})
export class DiagramModule {}

