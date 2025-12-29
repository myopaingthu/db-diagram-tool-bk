import { Controller, Post, Get, Body, UseGuards, Request } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import type { ApiResponse } from "@src/types";
import type { AuthResponse } from "@src/types";

@Controller("/api/core/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/register")
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<AuthResponse>> {
    return this.authService.register(dto);
  }

  @Post("/login")
  async login(@Body() dto: LoginDto): Promise<ApiResponse<AuthResponse>> {
    return this.authService.login(dto);
  }

  @Get("/me")
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any): Promise<ApiResponse<any>> {
    return this.authService.getMe(req.user.userId);
  }
}

