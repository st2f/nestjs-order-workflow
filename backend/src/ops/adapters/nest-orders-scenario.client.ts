import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateOrderService } from '../../orders/application/create-order.service';
import { SCENARIO_USER_ID } from '../../shared/scenario-course-ids';
import type { OpsOrderSummaryDto } from '../ops.dto';
import { toOrderSummaryDto } from '../ops-read-model';
import type { ScenarioOrderCreator } from '../ports/scenario-order-creator';

@Injectable()
export class NestOrdersScenarioClient implements ScenarioOrderCreator {
  constructor(private readonly createOrderService: CreateOrderService) {}

  async createScenarioOrder(courseId: string): Promise<OpsOrderSummaryDto> {
    const order = await this.createOrderService.create({
      userId: SCENARIO_USER_ID,
      courseId,
      amount: '49.99',
      correlationId: randomUUID(),
    });

    return toOrderSummaryDto(order);
  }
}
