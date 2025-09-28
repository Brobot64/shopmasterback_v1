import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { SalesProduct } from './SalesProduct'; // Junction table for Sales

export enum SalesStatus {
    COMPLETED = 'completed',
    RETURNED = 'returned',
    PENDING = 'pending',
    CANCELLED = 'cancelled',
}

export enum PaymentChannel {
    CASH = 'cash',
    TRANSFER = 'transfer',
    CARD = 'card',
    OTHER = 'other',
    FLUTTER = 'flutter',
}

@Entity('sales')
export class Sales {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToMany(() => SalesProduct, salesProduct => salesProduct.sales, { cascade: true })
    products!: SalesProduct[]; // Products sold in this transaction

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    totalAmount!: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    discount!: number;

    @Column({ type: 'enum', enum: SalesStatus, default: SalesStatus.COMPLETED })
    status!: SalesStatus;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    remainingToPay!: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amountPaid!: number;

    @Column({ type: 'enum', enum: PaymentChannel })
    paymentChannel!: PaymentChannel;

    @Column({ type: 'jsonb', nullable: true }) // Customer details
    customer!: { name: string; phone?: string; email?: string; address?: string };

    @ManyToOne(() => User, user => user.salesRecords, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'salesPersonId' })
    salesPerson!: User;

    @Column({ type: 'uuid', nullable: true })
    salesPersonId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
