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
            if (!user.account_approved) {
                throw new UnauthorizedException('Your account is pending approval from the Pixby team.');
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
            if (existingUser.isVerified && !existingUser.account_approved) {
                // await this.requestApproval(existingUser.email);
                return {
                    message: 'Account pending approval.',
                    isVerifiedButNotApproved: true,
                    approval_sent_at: existingUser.approval_sent_at
                };
            } else if (existingUser.isVerified && existingUser.account_approved) {
                throw new UnauthorizedException('User with this email already exists');
            }
            else {
                // User exists but is not verified. Resend OTP.
                await this.resendOtp(userDto.email);
                return { message: 'OTP sent to existing unverified email.', isVerifiedButNotApproved: false };
            }
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
            const verifiedUser = await this.usersService.verifyUser(user.id);
            return {
                message: verifiedUser?.account_approved ? 'OTP verified successfully' : 'Email verified. Account pending approval.',
                accountApproved: verifiedUser?.account_approved,
                approval_sent_at: verifiedUser?.approval_sent_at,
                user: verifiedUser,
            };
        }
        throw new UnauthorizedException('Invalid or expired OTP');
    }

    async requestApproval(email: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        if (!user.isVerified) {
            throw new UnauthorizedException('User must be verified to request approval');
        }
        if (user.account_approved) {
            return { message: 'Account is already approved' };
        }

        // Check 1-hour cooldown
        if (user.approval_sent_at) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (user.approval_sent_at > oneHourAgo) {
                throw new UnauthorizedException('You can only request approval once every hour.');
            }
        }

        user.approval_sent_at = new Date();
        await user.save();

        await this.mailService.sendApprovalRequest(user);
        return { message: 'Approval request sent successfully', approval_sent_at: user.approval_sent_at };
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

    async getApprovalStatus(email: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return {
            account_approved: user.account_approved,
            approval_sent_at: user.approval_sent_at
        };
    }
}
