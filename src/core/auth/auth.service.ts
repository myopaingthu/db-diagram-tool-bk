import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { DatabaseService } from "@src/database/database.service";
import { AUTH_CONSTANTS } from "@src/constants";
import { CONFIG } from "@src/config";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { AuthResponse, JwtPayload, ApiResponse } from "@src/types";
import { ResponseUtil } from "@src/shared/util/response.util";

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<ApiResponse<AuthResponse>> {
    const existingUser = await this.database.User.findOne({ email: dto.email }).exec();
    if (existingUser) {
      return ResponseUtil.error("Email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(dto.password, AUTH_CONSTANTS.PASSWORD_SALT_ROUNDS);

    const user = await this.database.User.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      verified: !CONFIG.EMAIL_VERIFICATION_ENABLED,
    });

    const token = this.generateToken({ userId: user._id.toString(), email: user.email });

    return ResponseUtil.success({
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        verified: user.verified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    });
  }

  async login(dto: LoginDto): Promise<ApiResponse<AuthResponse>> {
    const user = await this.database.User.findOne({ email: dto.email }).exec();
    if (!user) {
      return ResponseUtil.error("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      return ResponseUtil.error("Invalid credentials", 401);
    }

    const token = this.generateToken({ userId: user._id.toString(), email: user.email });

    return ResponseUtil.success({
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        verified: user.verified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    });
  }

  async getMe(userId: string): Promise<ApiResponse<any>> {
    const user = await this.database.User.findById(userId).exec();
    if (!user) {
      return ResponseUtil.error("User not found", 404);
    }

    return ResponseUtil.success({
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      verified: user.verified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}

