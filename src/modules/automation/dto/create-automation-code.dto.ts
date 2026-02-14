
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAutomationCodeDto {
    @IsNotEmpty()
    @IsString()
    projectId: string;

    @IsNotEmpty()
    @IsString()
    buildId: string;

    @IsOptional()
    @IsOptional()
    automationCode: Record<string, any>;

    @IsOptional()
    variables: Record<string, any>;
}
