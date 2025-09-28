import { IsString, MinLength, IsOptional, IsNumber, Min, IsUrl, IsArray, IsEnum, IsUUID } from 'class-validator';
import { ProductStatus } from '../database/entities/Product';

export class CreateProductDto {
    @IsString()
    @MinLength(2)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    @Min(0)
    price!: number;

    @IsNumber()
    @Min(0)
    quantity!: number;

    @IsString()
    @MinLength(2)
    category!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @IsString()
    skuNumber?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    reOrderPoint?: number;
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    quantity?: number;

    @IsOptional()
    @IsString()
    @MinLength(2)
    category?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @IsString()
    skuNumber?: string;

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @IsOptional()
    @IsNumber()
    @Min(0)
    reOrderPoint?: number;
}
