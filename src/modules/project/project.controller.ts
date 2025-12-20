import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProjectService } from './project.service.js';
import { ProjectDto } from './dto/project.dto.js';
import { CreateBuildDto } from './dto/create-build.dto';

@ApiTags('Project')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(): Promise<ProjectDto[]> {
    return this.projectService.findAll();
  }

  @Post()
  async create(@Body() createProjectDto: ProjectDto): Promise<ProjectDto> {
    return this.projectService.create(createProjectDto);
  }

  @Post('build')
  @ApiOperation({ summary: 'Create a new build' })
  @ApiQuery({ name: 'projectId', type: String, description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Build created successfully' })
  async createBuild(
      @Query('projectId') projectId: string,
      @Body() createBuildDto: CreateBuildDto
  ) {
      return this.projectService.createBuild(projectId, createBuildDto);
  }

  @Get('builds')
  @ApiOperation({ summary: 'Get all builds for a project' })
  @ApiQuery({ name: 'projectId', type: String, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of builds' })
  async getBuilds(@Query('projectId') projectId: string) {
    return this.projectService.getBuildsByProjectId(projectId);
  }
}
