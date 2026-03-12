import { IsIn, IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export class LatestBuildStatsDto {
  @IsString()
  @IsOptional()
  readonly buildId?: string;

  @IsString()
  @IsOptional()
  readonly buildName?: string;

  @IsNumber()
  @IsOptional()
  readonly passCount?: number;

  @IsNumber()
  @IsOptional()
  readonly failCount?: number;

  @IsBoolean()
  @IsOptional()
  readonly comparisonRunning?: boolean;

  @IsOptional()
  readonly lastCompared?: Date;
}

export class ProjectDto {
  @IsString()
  readonly projectId: string;

  @IsString()
  readonly projectName: string;

  @IsIn(['smart image', 'website', 'android tv', 'roku tv', 'mobile', 'fire tv', 'smart tv'])
  readonly projectType: string;

  @IsOptional()
  readonly latestbuildTStats?: LatestBuildStatsDto;
}
