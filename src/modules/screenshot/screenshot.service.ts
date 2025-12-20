import { Injectable, Inject } from '@nestjs/common';
import { Screenshot } from '../../shared/entity/screenshot.entity';

@Injectable()
export class ScreenshotService {
    constructor(
        @Inject('SCREENSHOT_REPOSITORY')
        private screenshotRepository: typeof Screenshot
    ) { }

    async findAll(projectId: string, buildId: string): Promise<any[]> {
        const screenshots = await this.screenshotRepository.findAll<Screenshot>({
            where: {
                projectId,
                buildId
            }
        });

        return screenshots.map(s => {
            const screen = s.get({ plain: true });
            // REFACTOR: Screenshot is already a URL string, no conversion needed.
            // if (screen.screenshot) { ... }
            return screen;
        });
    }
}
