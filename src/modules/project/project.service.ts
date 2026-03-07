import { Injectable, Inject, Logger } from '@nestjs/common';
import { Projects, Build, Result, FigmaScreens, Screenshot, ModelResult, ResultStatus } from '../../shared/entity/index.js';
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

    return Promise.all(projects.map(async (project) => {
      const data = project.get();

      const latestBuild = await this.buildRepository.findOne({
        where: { projectId: data.projectId },
        order: [['lastCompared', 'DESC']],
      });
      Logger.log(latestBuild)
      let passCount: number | undefined = undefined;
      let failCount: number | undefined = undefined;
      let comparisonRunning = false;
      let lastCompared: Date | undefined = undefined;

      let latestbuildTStats: {
        buildId?: string;
        buildName?: string;
        passCount?: number;
        failCount?: number;
        comparisonRunning?: boolean;
        lastCompared?: Date;
      } | {} = {};

      if (latestBuild) {
        comparisonRunning = latestBuild.comparisonRunning || false;
        lastCompared = latestBuild.lastCompared || undefined;

        if (lastCompared) {
          passCount = await this.resultRepository.count({
            where: {
              projectId: data.projectId,
              buildId: latestBuild.buildId,
              resultStatus: ResultStatus.PASS,
            }
          });

          failCount = await this.resultRepository.count({
            where: {
              projectId: data.projectId,
              buildId: latestBuild.buildId,
              resultStatus: ResultStatus.FAIL,
            }
          });
        }

        if (lastCompared) {
          latestbuildTStats = {
            buildId: latestBuild.buildId,
            buildName: latestBuild.buildName,
            passCount,
            failCount,
            comparisonRunning,
            lastCompared
          };
        } else if (comparisonRunning) {
          latestbuildTStats = {
            buildId: latestBuild.buildId,
            buildName: latestBuild.buildName,
            comparisonRunning,
          };
        }
      }

      return {
        projectId: data.projectId,
        projectName: data.projectName,
        projectType: data.projectType,
        latestbuildTStats
      };
    }));
  }

  async create(projectDto: ProjectDto): Promise<ProjectDto> {
    const project = await this.projectsRepository.create<Projects>({
      projectId: projectDto.projectId,
      projectName: projectDto.projectName,
      projectType: projectDto.projectType,
    } as any);

    const dtoAny = projectDto as any;
    if (dtoAny.buildName) {
      await this.createBuild(projectDto.projectId, { buildName: dtoAny.buildName });
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
