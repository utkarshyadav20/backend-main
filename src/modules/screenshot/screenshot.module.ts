import { Module } from '@nestjs/common';
import { ScreenshotController } from './screenshot.controller';
import { ScreenshotService } from './screenshot.service';
import { screenshotProviders } from './screenshot.providers';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [ScreenshotController],
    providers: [
        ScreenshotService,
        ...screenshotProviders,
    ],
})
export class ScreenshotModule { }
