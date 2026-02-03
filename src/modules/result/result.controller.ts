import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ResultService } from './result.service';
import { StoreModelResultDto } from './dto/model-result.dto.js';
import { UpdateModelResultItemDto } from './dto/update-model-result-item.dto';

@Controller('result')
export class ResultController {
  constructor(private readonly resultService: ResultService) { }

  @Get('get-results')
  async getResults(
    @Query('projectId') projectId: string,
    @Query('buildId') buildId: string,
  ) {
    return this.resultService.getResults(projectId, buildId);
  }

  @Get('details')
  async getDetailedResult(
    @Query('projectId') projectId: string,
    @Query('buildId') buildId: string,
    @Query('screenName') screenName: string,
    @Query('projectType') projectType?: string,
  ) {
    return this.resultService.getDetailedResult(projectId, buildId, screenName, projectType);
  }
  @Get('model-result')
  async getModelResult(
    @Query('projectId') projectId: string,
    @Query('buildId') buildId: string,
    @Query('imageName') imageName: string,
    @Query('projectType') projectType: string,
  ) {
    return this.resultService.getModelResult(projectId, buildId, imageName, projectType);
  }

  @Get('build-report')
  async getBuildReport(
    @Query('projectId') projectId: string,
    @Query('buildId') buildId: string,
  ) {
    return this.resultService.getBuildReport(projectId, buildId);
  }

  @Post('update-model-item')
  async updateModelItem(
    @Query('projectId') projectId: string,
    @Query('buildId') buildId: string,
    @Query('screenName') screenName: string,
    @Body() dto: UpdateModelResultItemDto
  ) {
    return this.resultService.updateModelResultItem(
      projectId,
      buildId,
      screenName,
      dto.itemId,
      dto.updates
    );
  }

  @Post('update-status')
  async updateStatus(
    @Query('projectId') projectId: string,
    @Query('buildId') buildId: string,
    @Query('screenName') screenName: string,
    @Body('status') status: string | number
  ) {
    return this.resultService.updateResultStatus(
      projectId,
      buildId,
      screenName,
      status
    );
  }

  // @Post('store-model-result')
  // async storeModelResult(@Body() storeModelResultDto: StoreModelResultDto) {
  //   return this.resultService.storeModelResult(storeModelResultDto);
  // }
}
