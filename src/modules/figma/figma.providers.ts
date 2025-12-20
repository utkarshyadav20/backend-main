import { FigmaScreens, Projects } from '../../shared/entity/index.js';

export const figmaProviders = [
  {
    provide: 'FIGMA_SCREENS_REPOSITORY',
    useValue: FigmaScreens,
  },
  {
    provide: 'PROJECTS_REPOSITORY',
    useValue: Projects,
  },
];
