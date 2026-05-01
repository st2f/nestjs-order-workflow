import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '../notification-type.enum';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Index()
  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({
    name: 'sent_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  sentAt!: Date;
}
