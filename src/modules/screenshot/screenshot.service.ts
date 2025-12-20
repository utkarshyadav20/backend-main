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
            if (screen.screenshot) {
                // Convert buffer/blob to base64
                if (Buffer.isBuffer(screen.screenshot)) {
                     screen.screenshot = `data:image/png;base64,${screen.screenshot.toString('base64')}`;
                } else if (screen.screenshot.type === 'Buffer') {
                     // Handle case where it might be parsed as JSON with type: 'Buffer'
                     screen.screenshot = `data:image/png;base64,${Buffer.from(screen.screenshot.data).toString('base64')}`;
                }
            }
            return screen;
        });
    }
}
