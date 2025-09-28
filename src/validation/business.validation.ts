import { IsString, MinLength, IsOptional, IsNumber, IsUrl, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class ContactDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsString()
    @MinLength(1)
    value!: string;
}

export class CreateBusinessDto {
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

    @IsUUID()
    ownerId!: string; // Required when admin creates a business for an existing owner
}

export class UpdateBusinessDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    name?: string;

    @IsOptional()
    @IsNumber()
    yearOfEstablishment?: number;

    @IsOptional()
    @IsString()
    @MinLength(2)
    category?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MinLength(5)
    address?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ContactDto)
    contact?: ContactDto[];

    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    status?: string; // e.g., 'active', 'suspended'
}

export class SubscribeBusinessDto {
    @IsUUID()
    subscriptionId!: string;
}
