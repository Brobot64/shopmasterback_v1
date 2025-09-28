import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Business } from './Business';
import { User } from './User';
import { Product } from './Product';
import { Inventory } from './Inventory';
import { Log } from './Log';

@Entity('outlets')
export class Outlet {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 255 })
    address!: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string;

    @Column({ type: 'jsonb', nullable: true })
    contact!: { name: string; value: string }[];

    @Column({ type: 'varchar', length: 50, default: 'active' }) // e.g., 'active', 'inactive'
    status!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    imageUrl!: string; // URL to image stored on Vercel CDN

    @Column({ type: 'text', nullable: true })
    description!: string;

    @ManyToOne(() => Business, business => business.outlets, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'businessId' })
    business!: Business;

    @Column({ type: 'uuid' })
    businessId!: string;

    @OneToMany(() => User, user => user.outlet)
    users!: User[]; // Users assigned to this specific outlet

    @OneToMany(() => Product, product => product.outlet)
    products!: Product[]; // Products specific to this outlet

    @OneToMany(() => Inventory, inventory => inventory.outlet)
    inventories!: Inventory[];

    @OneToMany(() => Log, log => log.outlet)
    logs!: Log[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
