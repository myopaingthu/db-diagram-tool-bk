import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { CONFIG } from "@src/config";
import { DatabaseService } from "@src/database/database.service";
import { JwtPayload } from "@src/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly database: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: CONFIG.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.database.User.findById(payload.userId).exec();
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return { userId: user._id, email: user.email };
  }
}

