import { Module } from '@nestjs/common';
import { CloudStorageService } from './cloud-storage.service';
import { CloudStorageController } from './cloud-storage.controller';

@Module({
    controllers: [CloudStorageController],
    providers: [CloudStorageService],
    exports: [CloudStorageService],
})
export class CloudStorageModule { }
