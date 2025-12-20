import { Module } from '@nestjs/common';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';
import { compareProviders } from './compare.providers';

@Module({
  controllers: [CompareController],
  providers: [CompareService, ...compareProviders],
})
export class CompareModule {}
