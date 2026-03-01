import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { CloudStorageService } from './cloud-storage.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('storage')
export class CloudStorageController {
    constructor(private readonly cloudStorageService: CloudStorageService) { }

    @Public()
    @Post('signed-url')
    async getSignedUrl(@Body() body: { filename: string; contentType?: string }) {
        if (!body.filename) {
            throw new HttpException('Filename is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.cloudStorageService.generateV4UploadSignedUrl(
                body.filename,
                body.contentType || 'image/png'
            );
            return result;
        } catch (error) {
            throw new HttpException('Failed to generate signed URL', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
