import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { PAYMENT_REPOSITORY } from './application/payment-repository';
import { ProcessOrderCreatedService } from './application/process-order-created.service';
import { Payment } from './entities/payment.entity';
import { AmqpOrderCreatedConsumer } from './infrastructure/amqp-order-created.consumer';
import { TypeormPaymentRepository } from './infrastructure/typeorm-payment.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), EventsModule],
  providers: [
    {
      provide: PAYMENT_REPOSITORY,
      useClass: TypeormPaymentRepository,
    },
    ProcessOrderCreatedService,
    AmqpOrderCreatedConsumer,
  ],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
