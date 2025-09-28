import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sales } from './Sales';
import { Product } from './Product';

@Entity('sales_products')
export class SalesProduct {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Sales, sales => sales.products, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'salesId' })
    sales!: Sales;

    @Column({ type: 'uuid' })
    salesId!: string;

    @ManyToOne(() => Product, product => product.salesProducts, { onDelete: 'RESTRICT' }) // Prevent deleting product if part of sales
    @JoinColumn({ name: 'productId' })
    product!: Product;

    @Column({ type: 'uuid' })
    productId!: string;

    @Column({ type: 'varchar', length: 255 })
    productName!: string; // Denormalized for easier reporting

    @Column({ type: 'int' })
    quantity!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    priceAtSale!: number; // Price at the time of sale
}
