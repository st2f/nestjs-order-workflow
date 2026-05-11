import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { ENROLLMENT_REPOSITORY } from './application/enrollment-repository';
import { ProcessPaymentSucceededService } from './application/process-payment-succeeded.service';
import { Enrollment } from './entities/enrollment.entity';
import { AmqpPaymentSucceededConsumer } from './infrastructure/amqp-payment-succeeded.consumer';
import { TypeormEnrollmentRepository } from './infrastructure/typeorm-enrollment.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), EventsModule],
  providers: [
    {
      provide: ENROLLMENT_REPOSITORY,
      useClass: TypeormEnrollmentRepository,
    },
    ProcessPaymentSucceededService,
    AmqpPaymentSucceededConsumer,
  ],
  exports: [TypeOrmModule],
})
export class EnrollmentsModule {}
