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
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { DiagramService } from "./diagram.service";
import { CreateDiagramDto, UpdateDiagramDto, SyncDiagramDto } from "./dto/diagram.dto";
import { JwtAuthGuard } from "@src/core/auth/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "@src/core/auth/interfaces/authenticated-request.interface";
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
    @Request() req: AuthenticatedRequest,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<ApiResponse<any>> {
    const pageNum = Math.max(page, 1);
    const limitNum = Math.min(Math.max(limit, 1), 100);
    return this.diagramService.list(req.user.userId, pageNum, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getById(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<any>> {
    return this.diagramService.findById(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.create(req.user.userId, dto.name, dto.description);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<boolean>> {
    return this.diagramService.delete(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("sync")
  async sync(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SyncDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.sync(req.user.userId, undefined, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put("sync/:id")
  async syncUpdate(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: SyncDiagramDto
  ): Promise<ApiResponse<any>> {
    return this.diagramService.sync(req.user.userId, id, dto);
  }
}
