import type { OpsOrderSummaryDto } from '../ops.dto';

export const SCENARIO_ORDER_CREATOR = Symbol('SCENARIO_ORDER_CREATOR');

export interface ScenarioOrderCreator {
  createScenarioOrder(courseId: string): Promise<OpsOrderSummaryDto>;
}
