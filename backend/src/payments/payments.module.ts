import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { PAYMENT_REPOSITORY } from './application/payment-repository';
import { ProcessOrderCreatedService } from './application/process-order-created.service';
import { ProcessRefundRequestedService } from './application/process-refund-requested.service';
import { Payment } from './entities/payment.entity';
import { AmqpOrderCreatedConsumer } from './infrastructure/amqp-order-created.consumer';
import { AmqpRefundRequestedConsumer } from './infrastructure/amqp-refund-requested.consumer';
import { TypeormPaymentRepository } from './infrastructure/typeorm-payment.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), EventsModule],
  providers: [
    {
      provide: PAYMENT_REPOSITORY,
      useClass: TypeormPaymentRepository,
    },
    ProcessOrderCreatedService,
    ProcessRefundRequestedService,
    AmqpOrderCreatedConsumer,
    AmqpRefundRequestedConsumer,
  ],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
