import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Outlet } from './Outlet';
import { User } from './User';

export enum InventoryStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    RECONCILED = 'reconciled',
}

@Entity('inventories')
export class Inventory {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Outlet, outlet => outlet.inventories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'outletId' })
    outlet!: Outlet;

    @Column({ type: 'uuid' })
    outletId!: string;

    @Column({ type: 'jsonb' }) // Array of products with counted and db quantities
    products!: { productId: string; name: string; counted: number; amountInDb: number; reconciled: boolean }[];

    @Column({ type: 'enum', enum: InventoryStatus, default: InventoryStatus.PENDING })
    status!: InventoryStatus;

    @ManyToOne(() => User, user => user.id, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'actionerId' })
    actioner!: User;

    @Column({ type: 'uuid', nullable: true })
    actionerId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
