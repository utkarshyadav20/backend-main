import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnalysisItem {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  description: string;
}

class ModelResultData {
  @IsString()
  imageName: string;

  @IsString()
  reference_url: string;

  @IsString()
  screenshot_url: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalysisItem)
  analysis: AnalysisItem[];
}

export class StoreModelResultDto {
  @IsString()
  projectId: string;

  @IsString()
  buildId: string;

  @IsString()
  projectType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModelResultData)
  data: ModelResultData[];
}
