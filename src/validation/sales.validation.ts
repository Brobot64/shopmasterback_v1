import { IsUUID, IsNumber, Min, IsArray, ValidateNested, IsOptional, IsString, IsEnum, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentChannel, SalesStatus } from '../database/entities/Sales';

class SalesProductItemDto {
    @IsUUID()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;
}

class CustomerDto {
    @IsString()
    @Min(1)
    name!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    address?: string;
}

export class RecordSaleDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SalesProductItemDto)
    products!: SalesProductItemDto[];

    @IsOptional()
    @ValidateNested()
    @Type(() => CustomerDto)
    customer?: CustomerDto;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount?: number;

    @IsNumber()
    @Min(0)
    amountPaid!: number;

    @IsEnum(PaymentChannel)
    paymentChannel!: PaymentChannel;

    @IsOptional()
    @IsEnum(SalesStatus)
    status?: SalesStatus;
}

export class UpdateSaleStatusDto {
    @IsEnum(SalesStatus)
    status!: SalesStatus;
}
