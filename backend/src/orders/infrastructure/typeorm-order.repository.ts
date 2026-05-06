import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionContext } from '../../events/application/transaction-runner';
import { NewOrder, OrderRepository } from '../application/order-repository';
import { Order } from '../entities/order.entity';

@Injectable()
export class TypeormOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(order: NewOrder, tx?: TransactionContext): Promise<Order> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;
    const repository = manager.getRepository(Order);

    return repository.save(repository.create(order));
  }
}
