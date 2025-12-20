import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CompareService } from './compare.service';
import { CompareBodyDto, CompareQueryDto } from './dto/compare-screenshot.dto';

@ApiTags('Compare')
@Controller('compare')
export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run screenshot comparison' })
  @ApiQuery({ name: 'sensitivity', required: false, type: String, description: 'Comparison sensitivity (e.g. 1x, 2x, 3x)' })
  @ApiQuery({ name: 'buildId', required: false, type: String, description: 'Build ID (optional) - if not passed, one will be created' })
  @ApiResponse({ status: 200, description: 'Comparison successful' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async runComparison(
    @Query() queryDto: CompareQueryDto,
    @Body() bodyDto: CompareBodyDto,
    @Query('buildId') buildId?: string,
  ) {
    return this.compareService.compareScreens(
      queryDto.projectId,
      queryDto.projectType,
      bodyDto.screenshots,
      buildId,
      queryDto.sensitivity ? parseInt(queryDto.sensitivity) : undefined,
    );
  }
}
