import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { CreateOrderService } from './application/create-order.service';
import { ORDER_REPOSITORY } from './application/order-repository';
import { ProcessOrderLifecycleEventService } from './application/process-order-lifecycle-event.service';
import { ProcessPaymentEventService } from './application/process-payment-event.service';
import { Order } from './entities/order.entity';
import { AmqpOrderLifecycleEventsConsumer } from './infrastructure/amqp-order-lifecycle-events.consumer';
import { AmqpPaymentEventsConsumer } from './infrastructure/amqp-payment-events.consumer';
import { TypeormOrderRepository } from './infrastructure/typeorm-order.repository';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), EventsModule],
  controllers: [OrdersController],
  providers: [
    CreateOrderService,
    ProcessPaymentEventService,
    ProcessOrderLifecycleEventService,
    AmqpPaymentEventsConsumer,
    AmqpOrderLifecycleEventsConsumer,
    {
      provide: ORDER_REPOSITORY,
      useClass: TypeormOrderRepository,
    },
  ],
  exports: [
    TypeOrmModule,
    CreateOrderService,
    ProcessPaymentEventService,
    ProcessOrderLifecycleEventService,
  ],
})
export class OrdersModule {}
