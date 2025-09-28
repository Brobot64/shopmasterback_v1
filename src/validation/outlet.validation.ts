import { IsString, MinLength, IsOptional, IsUrl, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class ContactDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsString()
    @MinLength(1)
    value!: string;
}

export class CreateOutletDto {
    @IsString()
    @MinLength(3)
    name!: string;

    @IsString()
    @MinLength(5)
    address!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

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
    description?: string;
}

export class UpdateOutletDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(5)
    address?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

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
    description?: string;

    @IsOptional()
    @IsString()
    status?: string;
}
