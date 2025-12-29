import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { DiagramService } from "./diagram.service";
import { CreateDiagramDto, UpdateDiagramDto } from "./dto/diagram.dto";
import { JwtAuthGuard } from "@src/core/auth/guards/jwt-auth.guard";
import type { ApiResponse } from "@src/types";

@Controller("api/core/diagrams")
export class DiagramController {
  constructor(private readonly diagramService: DiagramService) {}

  @Get("default")
  async getDefault(): Promise<ApiResponse<{ dbmlText: string; ast: any }>> {
    return this.diagramService.getDefault();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Request() req: any): Promise<ApiResponse<any[]>> {
    return this.diagramService.list(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getById(@Param("id") id: string): Promise<ApiResponse<any>> {
    return this.diagramService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req: any,
    @Body() dto: CreateDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.create(req.user.userId, dto.name, dto.description);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Request() req: any,
    @Body() dto: UpdateDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<ApiResponse<boolean>> {
    return this.diagramService.delete(id, req.user.userId);
  }
}

