import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { UserRole, UserStatus } from '../database/entities/User';

export class CreateUserDto {
    @IsString()
    @MinLength(2)
    firstName!: string;

    @IsString()
    @MinLength(2)
    lastName!: string;

    @IsEmail()
    email!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional() // Password can be auto-generated and sent via email/SMS
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(50, { message: 'Password must not exceed 50 characters' })
    password?: string;

    @IsEnum(UserRole)
    userType!: UserRole;

    @IsOptional()
    @IsUUID()
    businessId?: string;

    @IsOptional()
    @IsUUID()
    outletId?: string;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    lastName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(50, { message: 'Password must not exceed 50 characters' })
    password?: string;

    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    @IsOptional()
    @IsUUID()
    outletId?: string; // For reassigning store_exec/sales_rep
}
