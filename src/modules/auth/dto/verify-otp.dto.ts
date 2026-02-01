import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class VerifyOtpDto {
    @ApiProperty({ description: 'Email of the user', type: String })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'OTP code', type: String })
    @IsString()
    @IsNotEmpty()
    otp: string;
}
