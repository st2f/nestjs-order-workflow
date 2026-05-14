import { Inject, Injectable } from '@nestjs/common';
import {
  ENROLLMENT_FAILURE_COURSE_ID,
  PAYMENT_FAILURE_COURSE_ID,
  SUCCESS_COURSE_ID,
} from '../shared/scenario-course-ids';
import type {
  DebugStateDto,
  OpsOrderSummaryDto,
  OutboxEventDto,
} from './ops.dto';
import {
  SCENARIO_ORDER_CREATOR,
  type ScenarioOrderCreator,
} from './ports/scenario-order-creator';
import { DebugStateQueryService } from './use-cases/debug-state-query.service';
import { OutboxReplayService } from './use-cases/outbox-replay.service';

@Injectable()
export class OpsService {
  constructor(
    private readonly debugState: DebugStateQueryService,
    private readonly outboxReplay: OutboxReplayService,
    @Inject(SCENARIO_ORDER_CREATOR)
    private readonly orders: ScenarioOrderCreator,
  ) {}

  getDebugState(): Promise<DebugStateDto> {
    return this.debugState.getDebugState();
  }

  async createOrderSuccess(): Promise<OpsOrderSummaryDto> {
    return this.createScenarioOrder(SUCCESS_COURSE_ID);
  }

  async createOrderPaymentFailure(): Promise<OpsOrderSummaryDto> {
    return this.createScenarioOrder(PAYMENT_FAILURE_COURSE_ID);
  }

  async createOrderEnrollmentFailure(): Promise<OpsOrderSummaryDto> {
    return this.createScenarioOrder(ENROLLMENT_FAILURE_COURSE_ID);
  }

  republishOutboxEvent(id: string): Promise<OutboxEventDto> {
    return this.outboxReplay.republishOutboxEvent(id);
  }

  private createScenarioOrder(courseId: string): Promise<OpsOrderSummaryDto> {
    return this.orders.createScenarioOrder(courseId);
  }
}
