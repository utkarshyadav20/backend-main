import { Injectable, Inject } from '@nestjs/common';
import { User, UserRole } from '../../shared/entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @Inject('USER_REPOSITORY')
        private userModel: typeof User,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const user = new User();
        user.username = createUserDto.username;
        user.email = createUserDto.email;
        user.password = createUserDto.password;
        user.role = createUserDto.role || UserRole.VIEWER;
        user.otp = (createUserDto.otp || null) as any;
        user.otpExpiry = (createUserDto.otpExpiry || null) as any;
        return user.save();
    }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ where: { email } });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.userModel.findByPk(id);
    }

    async verifyUser(id: string): Promise<User | null> {
        const user = await this.findOneById(id);
        if (user) {
            user.isVerified = true;
            user.otp = null as any;
            user.otpExpiry = null as any;
            await user.save();
        }
        return user;
    }
}
