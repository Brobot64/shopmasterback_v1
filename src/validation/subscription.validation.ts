import { IsString, MinLength, IsNumber, Min, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
    @IsString()
    @MinLength(3)
    title!: string;

    @IsNumber()
    @Min(0)
    amount!: number;

    @IsString()
    duration!: string; // e.g., 'monthly', 'quarterly', 'annually'

    @IsOptional()
    @IsBoolean()
    isBulkDiscount?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    bulkDiscountPercentage?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    features?: string[];

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateSubscriptionDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    title?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    amount?: number;

    @IsOptional()
    @IsString()
    duration?: string;

    @IsOptional()
    @IsBoolean()
    isBulkDiscount?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    bulkDiscountPercentage?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    features?: string[];

    @IsOptional()
    @IsString()
    description?: string;
}
