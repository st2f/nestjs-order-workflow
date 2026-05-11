import { Controller, Get, Param, Post } from '@nestjs/common';
import { OpsService } from './ops.service';
import type {
  DebugStateDto,
  OpsOrderSummaryDto,
  OutboxEventDto,
} from './ops.dto';

@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('debug')
  getDebugState(): Promise<DebugStateDto> {
    return this.ops.getDebugState();
  }

  @Post('scenarios/order-success')
  createOrderSuccess(): Promise<OpsOrderSummaryDto> {
    return this.ops.createOrderSuccess();
  }

  @Post('scenarios/payment-failure')
  createOrderPaymentFailure(): Promise<OpsOrderSummaryDto> {
    return this.ops.createOrderPaymentFailure();
  }

  @Post('scenarios/enrollment-failure')
  createOrderEnrollmentFailure(): Promise<OpsOrderSummaryDto> {
    return this.ops.createOrderEnrollmentFailure();
  }

  @Post('outbox/:id/republish')
  republishOutboxEvent(@Param('id') id: string): Promise<OutboxEventDto> {
    return this.ops.republishOutboxEvent(id);
  }
}
