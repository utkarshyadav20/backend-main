import { Module } from '@nestjs/common';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';
import { compareProviders } from './compare.providers';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [CompareController],
  providers: [CompareService, ...compareProviders],
})
export class CompareModule {}
