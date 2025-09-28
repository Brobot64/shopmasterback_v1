import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Business } from './Business';
import { Outlet } from './Outlet';

export enum LogAction {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    VIEW = 'view',
    LOGIN = 'login',
    LOGOUT = 'logout',
    INVENTORY_RECONCILE = 'inventory_reconcile',
    SALES_RECORD = 'sales_record',
    SUBSCRIPTION_CHANGE = 'subscription_change',
    USER_STATUS_CHANGE = 'user_status_change',
    // Add more specific actions as needed
}

@Entity('logs')
export class Log {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, user => user.performedLogs, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'performerId' })
    performer!: User;

    @Column({ type: 'uuid', nullable: true })
    performerId!: string;

    @Column({ type: 'varchar', length: 255, nullable: true }) // e.g., 'User', 'Product', 'Business'
    receiverType!: string;

    @Column({ type: 'uuid', nullable: true }) // ID of the entity that was acted upon
    receiverId!: string;

    @Column({ type: 'enum', enum: LogAction })
    action!: LogAction;

    @Column({ type: 'text' })
    description!: string;

    @ManyToOne(() => Business, business => business.logs, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'businessId' })
    business?: Business;

    @Column({ type: 'uuid', nullable: true })
    businessId?: string;

    @ManyToOne(() => Outlet, outlet => outlet.logs, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'outletId' })
    outlet?: Outlet;

    @Column({ type: 'uuid', nullable: true })
    outletId?: string;

    @CreateDateColumn()
    timestamp!: Date;
}
