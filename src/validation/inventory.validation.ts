import { IsUUID, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryStatus } from '../database/entities/Inventory';

class InventoryProductItemDto {
    @IsUUID()
    productId!: string;

    @IsNumber()
    @Min(0)
    counted!: number;
}

class ReconciledProductItemDto {
    @IsUUID()
    productId!: string;

    @IsNumber()
    @Min(0)
    reconciledQuantity!: number;
}

export class RecordInventoryDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InventoryProductItemDto)
    products!: InventoryProductItemDto[];
}

export class ReconcileInventoryDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReconciledProductItemDto)
    products!: ReconciledProductItemDto[];
}
