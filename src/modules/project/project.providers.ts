import { Projects, Build } from '../../shared/entity/index.js';

export const projectsProviders = [
  {
    provide: 'PROJECTS_REPOSITORY',
    useValue: Projects,
  },
  {
    provide: 'BUILD_REPOSITORY',
    useValue: Build,
  },
];
