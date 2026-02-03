import { Body, Controller, Delete, Get, Post, Query, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { FileInterceptor } from '@nestjs/platform-express';
import { FigmaService } from './figma.service.js';
import { CreateFigmaScreensDto } from './dto/figma-screen.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('figma')
export class FigmaController {
    constructor(private readonly figmaService: FigmaService) { }

    @Post('screens')
    async create(@Body() createFigmaScreensDto: CreateFigmaScreensDto) {
        return this.figmaService.processScreens(createFigmaScreensDto);
    }

    @Get('screens')
    async getScreens(
        @Query('projectId') projectId: string,
        @Query('projectType') projectType: string,
    ) {
        return this.figmaService.getScreens(projectId, projectType);
    }

    @Get('screen')
    async getScreen(
        @Query('projectId') projectId: string,
        @Query('projectType') projectType: string,
        @Query('screenName') screenName: string,
    ) {
        return this.figmaService.updateScreenImage(projectId, projectType, screenName);
    }

    @Get('update-all-screens')
    async updateAllScreens(
        @Query('projectId') projectId: string,
        @Query('projectType') projectType: string,
    ) {
        return this.figmaService.updateAllProjectScreens(projectId, projectType);
    }

    @Delete('screen')
    async deleteScreen(
        @Query('projectId') projectId: string,
        @Query('projectType') projectType: string,
        @Query('screenName') screenName: string,
    ) {
        return this.figmaService.deleteScreen(projectId, projectType, screenName);
    }

    @Delete('screens')
    async deleteAllScreens(
        @Query('projectId') projectId: string,
        @Query('projectType') projectType: string,
    ) {
        return this.figmaService.deleteAllProjectScreens(projectId, projectType);
    }

    @Post('upload-screen')
    async uploadScreen(
        @Body('imageUrl') imageUrl: string,
        @Body('projectId') projectId: string,
        @Body('projectType') projectType: string,
        @Body('screenName') screenName: string,
        @Body('buildId') buildId?: string,
    ) {
        if (!imageUrl) {
            throw new BadRequestException('No imageUrl provided');
        }
        return this.figmaService.uploadManualScreen(projectId, projectType, screenName, imageUrl, buildId);
    }
    @Post('extract-image')
    async extractImage(
        @Body('url') url: string,
        @Body('projectId') projectId?: string,
        @Body('projectType') projectType?: string,
        @Body('screenName') screenName?: string,
        @Body('buildId') buildId?: string,
    ) {
        if (!url) {
            throw new BadRequestException('URL is required');
        }
        const imageUrl = await this.figmaService.extractImageFromUrl(url);

        if (projectId && projectType) {
            // If project context provided, save it immediately (like manual upload)
            const name = screenName || 'Figma Screen';
            const savedScreen = await this.figmaService.uploadManualScreen(projectId, projectType, name, imageUrl, buildId);
            return { imageUrl, savedScreen };
        }

        return { imageUrl };
    }

    @Public()
    @Get('proxy-image')
    async getProxyImage(@Query('url') url: string, @Res() res: Response) {
        if (!url) {
            throw new BadRequestException('URL is required');
        }
        try {
            const response = await axios.get(url, { responseType: 'stream' });
            res.set('Content-Type', response.headers['content-type']);
            response.data.pipe(res);
        } catch (error) {
            throw new BadRequestException('Failed to fetch image');
        }
    }
}
