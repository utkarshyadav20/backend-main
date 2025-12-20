import { Result } from '../../shared/entity/index.js';

export const resultProviders = [
  {
    provide: 'RESULT_REPOSITORY',
    useValue: Result,
  },
];
