import { IsArray, IsString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FigmaScreenDataDto {
  @IsString()
  Screen_name: string;

  @IsString()
  screen_figma_url: string;

  @IsString()
  node_id: string;
}

export class CreateFigmaScreensDto {
  @IsString()
  project_id: string;

  @IsOptional()
  @IsString()
  build_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FigmaScreenDataDto)
  figma_data: FigmaScreenDataDto[];
}
