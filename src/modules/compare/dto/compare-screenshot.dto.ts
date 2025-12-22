import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested, IsOptional } from 'class-validator';

export class CompareScreenshotDto {
  @ApiProperty({ description: 'url of the screenshot', type: String })
  @IsString()
  image: string; 

  @ApiProperty({ description: 'Name of the image/screen', type: String })
  @IsString()
  imageName: string;
}

export class CompareQueryDto {
  @ApiProperty({ description: 'Project ID', type: String })
  @IsString()
  projectId: string; // Query params are strings by default, transform if needed

  @ApiProperty({ description: 'Project Type', type: String })
  @IsString()
  projectType: string;

  @ApiProperty({ description: 'Sensitivity level (optional)', type: String, required: false })
  @IsString()
  @IsString()
  @IsOptional()
  sensitivity?: string;

  @ApiProperty({ description: 'Minimum score percentage (1-100)', type: String, required: false })
  @IsString()
  @IsOptional()
  minScore?: string;
}

export class CompareBodyDto {
  @ApiProperty({ description: 'List of screenshots to compare', type: [CompareScreenshotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompareScreenshotDto)
  screenshots: CompareScreenshotDto[];
  
}
