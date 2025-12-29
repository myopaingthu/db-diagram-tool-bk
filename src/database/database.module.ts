import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DatabaseService } from "./database.service";
import { UserSchema } from "./schemas/user.schema";
import { DiagramSchema } from "./schemas/diagram.schema";
import { DiagramHistorySchema } from "./schemas/diagram-history.schema";
import { CONFIG } from "@src/config";

@Module({
  imports: [
    MongooseModule.forRoot(CONFIG.MONGODB_URI),
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "Diagram", schema: DiagramSchema },
      { name: "DiagramHistory", schema: DiagramHistorySchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}

