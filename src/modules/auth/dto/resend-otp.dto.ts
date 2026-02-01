import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class ResendOtpDto {
    @ApiProperty({ description: 'Email of the user', type: String })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;
}
