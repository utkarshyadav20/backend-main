import { Module } from '@nestjs/common';
import { ResultController } from './result.controller';
import { ResultService } from './result.service';
import { resultProviders } from './result.providers';

@Module({
  controllers: [ResultController],
  providers: [ResultService, ...resultProviders],
})
export class ResultModule {}
