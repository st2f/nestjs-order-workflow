import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OpsService } from './ops.service';
import type {
  DebugStateDto,
  OpsOrderSummaryDto,
  OutboxEventDto,
} from './ops.dto';

@Controller('ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
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
