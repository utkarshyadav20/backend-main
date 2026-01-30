import { Table, Column, Model, DataType } from 'sequelize-typescript';

export enum UserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    EDITOR = 'editor',
    VIEWER = 'viewer',
}

@Table
export class User extends Model<User> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare username: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare password: string;

    @Column({
        type: DataType.ENUM(...Object.values(UserRole)),
        defaultValue: UserRole.VIEWER,
    })
    declare role: UserRole;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare isVerified: boolean;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare otp: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare otpExpiry: Date;
}
