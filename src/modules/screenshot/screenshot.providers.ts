import { Screenshot } from '../../shared/entity/screenshot.entity';

export const screenshotProviders = [
    {
        provide: 'SCREENSHOT_REPOSITORY',
        useValue: Screenshot,
    },
];
