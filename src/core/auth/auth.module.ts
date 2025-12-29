import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { CONFIG } from "@src/config";
import { DatabaseModule } from "@src/database/database.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({
      secret: CONFIG.JWT_SECRET,
      signOptions: { expiresIn: CONFIG.JWT_EXPIRES_IN as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

