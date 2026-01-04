import { Injectable, Inject } from '@nestjs/common';
import { Projects, Build, Result, FigmaScreens, Screenshot, ModelResult } from '../../shared/entity/index.js';
import { Sequelize } from 'sequelize-typescript';
import { SEQUELIZE } from '../../shared/utils/constant/sequelize/sequelize-constant.js';
import { ProjectDto } from './dto/project.dto.js';
import { CreateBuildDto } from './dto/create-build.dto';

@Injectable()
export class ProjectService {
  constructor(
    @Inject('PROJECTS_REPOSITORY')
    private projectsRepository: typeof Projects,
    @Inject('BUILD_REPOSITORY')
    private buildRepository: typeof Build,
    @Inject('RESULT_REPOSITORY')
    private resultRepository: typeof Result,
    @Inject('FIGMA_SCREENS_REPOSITORY')
    private figmaScreensRepository: typeof FigmaScreens,
    @Inject('SCREENSHOT_REPOSITORY')
    private screenshotRepository: typeof Screenshot,
    @Inject('MODEL_RESULT_REPOSITORY')
    private modelResultRepository: typeof ModelResult,
    @Inject(SEQUELIZE)
    private readonly sequelize: Sequelize,
  ) { }

  async findAll(): Promise<ProjectDto[]> {
    const projects = await this.projectsRepository.findAll<Projects>();
    console.log(projects);
    return projects.map(project => {
      const data = project.get();
      return {
        projectId: data.projectId,
        projectName: data.projectName,
        projectType: data.projectType,
      };
    });
  }

  async create(projectDto: ProjectDto): Promise<ProjectDto> {
    const project = await this.projectsRepository.create<Projects>({
      projectId: projectDto.projectId,
      projectName: projectDto.projectName,
      projectType: projectDto.projectType,
    } as any);

    if (projectDto.buildName) {
      await this.createBuild(projectDto.projectId, { buildName: projectDto.buildName });
    }

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      projectType: project.projectType,
    };
  }

  async createBuild(projectId: string, createBuildDto: CreateBuildDto) {
    const buildId = `${Date.now()}build`;
    const build = await this.buildRepository.create({
      buildId: buildId,
      projectId: projectId,
      buildName: createBuildDto.buildName
    } as any);
    return build;
  }

  async getBuildsByProjectId(projectId: string) {
    return this.buildRepository.findAll({
      where: { projectId },
      attributes: ['buildId', 'buildName']
    });
  }

  async deleteProject(projectId: string): Promise<{ message: string }> {
    await this.sequelize.transaction(async (t) => {
      await this.screenshotRepository.destroy({ where: { projectId }, transaction: t });
      await this.resultRepository.destroy({ where: { projectId }, transaction: t });
      await this.modelResultRepository.destroy({ where: { projectId }, transaction: t });
      await this.figmaScreensRepository.destroy({ where: { projectId }, transaction: t });
      await this.buildRepository.destroy({ where: { projectId }, transaction: t });
      await this.projectsRepository.destroy({ where: { projectId }, transaction: t });
    });
    return { message: 'Project deleted successfully' };
  }
}
