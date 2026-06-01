import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuthProviderType } from '@estateops/shared';
import { User } from '../../users/entities/user.entity';

@Entity('auth_providers')
export class AuthProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_auth_providers_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'user_id' })
  user!: Promise<User>;

  @Column({
    type: 'enum',
    enum: AuthProviderType,
    enumName: 'auth_provider_type',
  })
  provider!: AuthProviderType;

  @Column({ name: 'provider_user_id', type: 'varchar', length: 255 })
  providerUserId!: string;

  @Column({ name: 'access_token_hash', type: 'varchar', length: 255, nullable: true })
  accessTokenHash!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
