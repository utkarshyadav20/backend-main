import { Injectable, Inject } from '@nestjs/common';
import { Projects, Build } from '../../shared/entity/index.js';
import { ProjectDto } from './dto/project.dto.js';
import { CreateBuildDto } from './dto/create-build.dto';

@Injectable()
export class ProjectService {
  constructor(
    @Inject('PROJECTS_REPOSITORY')
    private projectsRepository: typeof Projects,
    @Inject('BUILD_REPOSITORY')
    private buildRepository: typeof Build
  ) {}

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
}
