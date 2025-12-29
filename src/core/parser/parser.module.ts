import { Module } from "@nestjs/common";
import { ParserService } from "./parser.service";
import { DbmlConverterService } from "./dbml-converter.service";
import { ValidatorService } from "./validator.service";

@Module({
  providers: [ParserService, DbmlConverterService, ValidatorService],
  exports: [ParserService, DbmlConverterService, ValidatorService],
})
export class ParserModule {}

