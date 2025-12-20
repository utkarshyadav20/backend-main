import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller.js';
import { ProjectService } from './project.service.js';
import { projectsProviders } from './project.providers.js';

@Module({
  imports: [],
  controllers: [ProjectController],
  providers: [ProjectService, ...projectsProviders],
})
export class ProjectModule {}
