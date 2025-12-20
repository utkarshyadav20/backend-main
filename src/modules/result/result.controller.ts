import { Controller, Get, Query } from '@nestjs/common';
import { ResultService } from './result.service';

@Controller('result')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @Get('get-results')
  async getResults(
    @Query('projectId') projectId: string,
    @Query('buildId') buildId: string,
  ) {
    return this.resultService.getResults(projectId, buildId);
  }
}
