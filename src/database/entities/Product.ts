import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Outlet } from './Outlet';
import { Business } from './Business';
import { SalesProduct } from './SalesProduct'; // Junction table for Sales

export enum ProductStatus {
    AVAILABLE = 'available',
    LOW_STOCK = 'low_stock',
    OUT_OF_STOCK = 'out_of_stock',
    DISCONTINUED = 'discontinued',
}

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price!: number;

    @Column({ type: 'int' })
    quantity!: number; // Current stock quantity

    @Column({ type: 'varchar', length: 255 })
    category!: string;

    @Column({ type: 'jsonb', nullable: true })
    tags!: string[];

    @Column({ type: 'varchar', length: 255, nullable: true })
    imageUrl!: string; // URL to image stored on Vercel CDN

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    minPrice!: number; // Minimum selling price

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    skuNumber!: string; // Stock Keeping Unit

    @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.AVAILABLE })
    status!: ProductStatus;

    @Column({ type: 'int', default: 10 }) // Threshold for low stock notification
    reOrderPoint!: number;

    @ManyToOne(() => Outlet, outlet => outlet.products, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'outletId' })
    outlet!: Outlet;

    @Column({ type: 'uuid' })
    outletId!: string;

    @ManyToOne(() => Business, business => business.products, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'businessId' })
    business!: Business;

    @Column({ type: 'uuid' })
    businessId!: string;

    @OneToMany(() => SalesProduct, salesProduct => salesProduct.product)
    salesProducts!: SalesProduct[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
