import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';
import { Subscription } from './Subscription';
import { Outlet } from './Outlet';
import { Product } from './Product';
import { Log } from './Log';

@Entity('businesses')
export class Business {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    name!: string;

    @Column({ type: 'int', nullable: true })
    yearOfEstablishment!: number;

    @Column({ type: 'varchar', length: 255 })
    category!: string;

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column({ type: 'varchar', length: 255 })
    address!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email!: string;

    @Column({ type: 'jsonb', nullable: true }) // Store as JSONB for flexible contact info
    contact!: { name: string; value: string }[];

    @Column({ type: 'varchar', length: 255, nullable: true })
    imageUrl!: string; // URL to image stored on Vercel CDN

    @Column({ type: 'date', nullable: true })
    nextSubRenewal!: Date;

    @Column({ type: 'boolean', default: false })
    activeSubStatus!: boolean;

    @Column({ type: 'varchar', length: 50, default: 'active' }) // e.g., 'active', 'suspended', 'pending'
    status!: string;

    @OneToOne(() => User, user => user.business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ownerId' })
    owner!: User; // The user who owns this business

    @Column({ type: 'uuid' })
    ownerId!: string;

    @ManyToOne(() => Subscription, subscription => subscription.businesses, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'subscriptionId' })
    subscription?: Subscription;

    @Column({ type: 'uuid', nullable: true })
    subscriptionId?: string;

    @OneToMany(() => User, user => user.business)
    users!: User[]; // Staff associated with this business

    @OneToMany(() => Outlet, outlet => outlet.business)
    outlets!: Outlet[];

    @OneToMany(() => Product, product => product.business)
    products!: Product[]; // All products across all outlets of this business

    @OneToMany(() => Log, log => log.business)
    logs!: Log[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
