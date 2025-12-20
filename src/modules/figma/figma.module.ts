import { Module } from '@nestjs/common';
import { FigmaController } from './figma.controller.js';
import { FigmaService } from './figma.service.js';
import { figmaProviders } from './figma.providers.js';

@Module({
  controllers: [FigmaController],
  providers: [FigmaService, ...figmaProviders],
})
export class FigmaModule {}
