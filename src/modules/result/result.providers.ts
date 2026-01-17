import { Result, ModelResult, Projects, Build } from '../../shared/entity/index.js';

export const resultProviders = [
  {
    provide: 'RESULT_REPOSITORY',
    useValue: Result,
  },
  {
    provide: 'MODEL_RESULT_REPOSITORY',
    useValue: ModelResult,
  },
  {
    provide: 'PROJECT_REPOSITORY',
    useValue: Projects,
  },
  {
    provide: 'BUILD_REPOSITORY',
    useValue: Build,
  },
];
