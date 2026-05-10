import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionContext } from '../../events/application/transaction-runner';
import { NewOrder, OrderRepository } from '../application/order-repository';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../order-status.enum';

@Injectable()
export class TypeormOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(
    orderId: string,
    tx?: TransactionContext,
  ): Promise<Order | null> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;

    return manager.getRepository(Order).findOneBy({ id: orderId });
  }

  async create(order: NewOrder, tx?: TransactionContext): Promise<Order> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;
    const repository = manager.getRepository(Order);

    return repository.save(repository.create(order));
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    tx?: TransactionContext,
  ): Promise<void> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;

    await manager.getRepository(Order).update(orderId, { status });
  }
}
