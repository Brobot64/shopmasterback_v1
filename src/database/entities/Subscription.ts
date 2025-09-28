import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Business } from './Business';

@Entity('subscriptions')
export class Subscription {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    title!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @Column({ type: 'varchar', length: 50 }) // e.g., 'monthly', 'quarterly', 'annually'
    duration!: string;

    @Column({ type: 'boolean', default: false })
    isBulkDiscount!: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    bulkDiscountPercentage!: number;

    @Column({ type: 'jsonb', nullable: true }) // Store as JSONB for flexible features list
    features!: string[];

    @Column({ type: 'text', nullable: true })
    description!: string;

    @OneToMany(() => Business, business => business.subscription)
    businesses!: Business[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
