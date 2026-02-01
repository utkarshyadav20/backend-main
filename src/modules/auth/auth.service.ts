import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        if (user && (await bcrypt.compare(pass, user.password))) {
            if (!user.isVerified) {
                throw new UnauthorizedException('Please verify your email first');
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = user['dataValues'] || user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id, role: user.role, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async signUp(userDto: CreateUserDto) {
        const existingUser = await this.usersService.findOneByEmail(userDto.email);
        if (existingUser) {
            throw new UnauthorizedException('User with this email already exists');
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(userDto.password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 mins expiry

        const newUser = await this.usersService.create({
            ...userDto,
            password: hashedPassword,
            otp,
            otpExpiry,
        } as CreateUserDto);

        await this.mailService.sendUserConfirmation(newUser, otp);
        return newUser;
    }

    async verifyOtp(email: string, otp: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (
            user &&
            user.otp === otp &&
            user.otpExpiry > new Date()
        ) {
            return this.usersService.verifyUser(user.id);
        }
        throw new UnauthorizedException('Invalid or expired OTP');
    }

    async resendOtp(email: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.isVerified) {
            throw new UnauthorizedException('User already verified');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 mins expiry

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        await this.mailService.sendUserConfirmation(user, otp);
        return { message: 'OTP sent successfully' };
    }
}
