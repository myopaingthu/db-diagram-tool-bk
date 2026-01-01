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
  Query,
} from "@nestjs/common";
import { DiagramService } from "./diagram.service";
import { CreateDiagramDto, UpdateDiagramDto, SyncDiagramDto } from "./dto/diagram.dto";
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
  async list(
    @Request() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ): Promise<ApiResponse<any>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.diagramService.list(req.user.userId, pageNum, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getById(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<ApiResponse<any>> {
    return this.diagramService.findById(id, req.user.userId);
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

  @UseGuards(JwtAuthGuard)
  @Post("sync")
  async sync(
    @Request() req: any,
    @Body() dto: SyncDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.sync(req.user.userId, undefined, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put("sync/:id")
  async syncUpdate(
    @Param("id") id: string,
    @Request() req: any,
    @Body() dto: SyncDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.sync(req.user.userId, id, dto);
  }
}

