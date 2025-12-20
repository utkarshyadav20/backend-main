import { Controller, Get, Query } from '@nestjs/common';
import { ScreenshotService } from './screenshot.service';
import { GetScreenshotsDto } from './dto/get-screenshots.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('screenshot')
@Controller('screenshot')
export class ScreenshotController {
    constructor(private readonly screenshotService: ScreenshotService) { }

    @Get('get-screenshots')
    @ApiOperation({ summary: 'Get all screenshots for a project and build' })
    async getScreenshots(@Query() query: GetScreenshotsDto) {
        return await this.screenshotService.findAll(query.projectId, query.buildId);
    }
}
