import { Module } from '@nestjs/common';
import { ResultController } from './result.controller';
import { ResultService } from './result.service';
import { resultProviders } from './result.providers';
import { figmaProviders } from '../figma/figma.providers';
import { screenshotProviders } from '../screenshot/screenshot.providers';

@Module({
  controllers: [ResultController],
  providers: [ResultService, ...resultProviders, ...figmaProviders, ...screenshotProviders],
})
export class ResultModule {}
