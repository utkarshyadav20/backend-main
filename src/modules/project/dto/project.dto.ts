import { IsIn, IsNumber, IsString, IsOptional } from 'class-validator';

export class ProjectDto {
  @IsString()
  readonly projectId: string;

  @IsString()
  readonly projectName: string;

  @IsIn(['smart image', 'website', 'android tv', 'roku tv', 'mobile', 'fire tv', 'smart tv'])
  readonly projectType: string;

  @IsString()
  @IsOptional()
  readonly buildName?: string;
}
