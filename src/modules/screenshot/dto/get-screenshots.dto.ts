import { IsNotEmpty, IsString } from 'class-validator';

export class GetScreenshotsDto {
    @IsNotEmpty()
    @IsString()
    readonly projectId: string;

    @IsNotEmpty()
    @IsString()
    readonly buildId: string;
}
