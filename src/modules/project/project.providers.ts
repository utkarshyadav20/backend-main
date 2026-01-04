import { Projects, Build, Result, FigmaScreens, Screenshot, ModelResult } from '../../shared/entity/index.js';

export const projectsProviders = [
  {
    provide: 'PROJECTS_REPOSITORY',
    useValue: Projects,
  },
  {
    provide: 'BUILD_REPOSITORY',
    useValue: Build,
  },
  {
    provide: 'RESULT_REPOSITORY',
    useValue: Result,
  },
  {
    provide: 'FIGMA_SCREENS_REPOSITORY',
    useValue: FigmaScreens,
  },
  {
    provide: 'SCREENSHOT_REPOSITORY',
    useValue: Screenshot,
  },
  {
    provide: 'MODEL_RESULT_REPOSITORY',
    useValue: ModelResult,
  },
];
