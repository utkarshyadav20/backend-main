import { User } from '../../shared/entity/index.js';

export const usersProviders = [
    {
        provide: 'USER_REPOSITORY',
        useValue: User,
    },
];
