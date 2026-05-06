import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { CreateOrderService } from './application/create-order.service';
import { ORDER_REPOSITORY } from './application/order-repository';
import { Order } from './entities/order.entity';
import { TypeormOrderRepository } from './infrastructure/typeorm-order.repository';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), EventsModule],
  controllers: [OrdersController],
  providers: [
    CreateOrderService,
    {
      provide: ORDER_REPOSITORY,
      useClass: TypeormOrderRepository,
    },
  ],
  exports: [TypeOrmModule, CreateOrderService],
})
export class OrdersModule {}
