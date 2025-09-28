import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsUUID, IsEnum, IsNumber, IsUrl, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../database/entities/User';

class ContactDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsString()
    @MinLength(1)
    value!: string;
}

export class RegisterOwnerUserDto {
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

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(50, { message: 'Password must not exceed 50 characters' })
    password!: string;
}

export class RegisterOwnerBusinessDto {
    @IsString()
    @MinLength(3)
    name!: string;

    @IsOptional()
    @IsNumber()
    yearOfEstablishment?: number;

    @IsString()
    @MinLength(2)
    category!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @MinLength(5)
    address!: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ContactDto)
    contact?: ContactDto[];

    @IsOptional()
    @IsUrl()
    imageUrl?: string;
}

export class RegisterOwnerDto {
    @ValidateNested()
    @Type(() => RegisterOwnerUserDto)
    userData!: RegisterOwnerUserDto;

    @ValidateNested()
    @Type(() => RegisterOwnerBusinessDto)
    businessData!: RegisterOwnerBusinessDto;
}

export class VerifyOwnerRegistrationDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    @MaxLength(6)
    otp!: string;
}

export class LoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;
}
