import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBuildDto {
  @ApiProperty({ description: 'Name of the build', type: String })
  @IsString()
  @IsNotEmpty()
  buildName: string;
}
