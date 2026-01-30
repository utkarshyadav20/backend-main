import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { UserRole } from '../../../shared/entity/user.entity';

export class CreateUserDto {
    @ApiProperty({ description: 'Username of the user', type: String })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ description: 'Email of the user', type: String })
    @IsString()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'Password of the user', type: String })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({ description: 'Role of the user', enum: UserRole, required: false })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiProperty({ description: 'OTP for verification', type: String, required: false })
    @IsOptional()
    @IsString()
    otp?: string;

    @ApiProperty({ description: 'OTP expiry date', type: Date, required: false })
    @IsOptional()
    // Using simple type approach or transform if needed, but for now matching entity
    otpExpiry?: Date;
}
