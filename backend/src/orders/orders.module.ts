import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { CreateOrderService } from './application/create-order.service';
import { ORDER_REPOSITORY } from './application/order-repository';
import { ProcessPaymentEventService } from './application/process-payment-event.service';
import { Order } from './entities/order.entity';
import { AmqpPaymentEventsConsumer } from './infrastructure/amqp-payment-events.consumer';
import { TypeormOrderRepository } from './infrastructure/typeorm-order.repository';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), EventsModule],
  controllers: [OrdersController],
  providers: [
    CreateOrderService,
    ProcessPaymentEventService,
    AmqpPaymentEventsConsumer,
    {
      provide: ORDER_REPOSITORY,
      useClass: TypeormOrderRepository,
    },
  ],
  exports: [TypeOrmModule, CreateOrderService, ProcessPaymentEventService],
})
export class OrdersModule {}
