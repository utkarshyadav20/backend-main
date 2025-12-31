import { Result, ModelResult } from '../../shared/entity/index.js';

export const resultProviders = [
  {
    provide: 'RESULT_REPOSITORY',
    useValue: Result,
  },
  {
    provide: 'MODEL_RESULT_REPOSITORY',
    useValue: ModelResult,
  },
];
