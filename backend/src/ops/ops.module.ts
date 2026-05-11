import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { OrdersModule } from '../orders/orders.module';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({
  imports: [EventsModule, OrdersModule],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
