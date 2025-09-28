import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Business } from './Business';
import { Outlet } from './Outlet';
import { Log } from './Log';
import { Sales } from './Sales';

export enum UserRole {
    ADMIN = 'admin',
    OWNER = 'owner',
    STORE_EXECUTIVE = 'store_executive',
    SALES_REP = 'sales_rep',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    firstName!: string;

    @Column({ type: 'varchar', length: 255 })
    lastName!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email!: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone!: string;

    @Column({ type: 'varchar', length: 255 })
    password!: string; // Hashed password

    @Column({ type: 'enum', enum: UserRole, default: UserRole.SALES_REP })
    userType!: UserRole;

    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
    status!: UserStatus;

    @Column({ type: 'timestamp', nullable: true })
    lastLogin!: Date;

    @ManyToOne(() => Business, business => business.users, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'businessId' })
    business?: Business;

    @Column({ type: 'uuid', nullable: true })
    businessId?: string;

    @ManyToOne(() => Outlet, outlet => outlet.users, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'outletId' })
    outlet?: Outlet;

    @Column({ type: 'uuid', nullable: true })
    outletId?: string;

    @OneToMany(() => Log, log => log.performer)
    performedLogs!: Log[];

    @OneToMany(() => Sales, sales => sales.salesPerson)
    salesRecords!: Sales[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
