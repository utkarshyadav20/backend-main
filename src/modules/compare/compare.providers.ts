import { FigmaScreens, Result, Build, Screenshot } from '../../shared/entity/index';

export const compareProviders = [
  {
    provide: 'FIGMA_SCREENS_REPOSITORY',
    useValue: FigmaScreens,
  },
  {
    provide: 'RESULT_REPOSITORY',
    useValue: Result,
  },
  {
    provide: 'BUILD_REPOSITORY',
    useValue: Build,
  },
  {
    provide: 'SCREENSHOT_REPOSITORY',
    useValue: Screenshot,
  },
];
