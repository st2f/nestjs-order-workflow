import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { OrdersModule } from '../orders/orders.module';
import { NestOrdersScenarioClient } from './adapters/nest-orders-scenario.client';
import { PostgresDebugStateRepository } from './adapters/postgres-debug-state.repository';
import { PostgresOutboxReplayRepository } from './adapters/postgres-outbox-replay.repository';
import { OpsController } from './ops.controller';
import { OpsLiveGateway } from './ops-live.gateway';
import { OpsService } from './ops.service';
import { DEBUG_STATE_READER } from './ports/debug-state-reader';
import { OUTBOX_REPLAY_PORT } from './ports/outbox-replay-port';
import { SCENARIO_ORDER_CREATOR } from './ports/scenario-order-creator';
import { DebugStateQueryService } from './use-cases/debug-state-query.service';
import { OutboxReplayService } from './use-cases/outbox-replay.service';

@Module({
  imports: [AuthModule, EventsModule, OrdersModule],
  controllers: [OpsController],
  providers: [
    DebugStateQueryService,
    {
      provide: DEBUG_STATE_READER,
      useClass: PostgresDebugStateRepository,
    },
    {
      provide: OUTBOX_REPLAY_PORT,
      useClass: PostgresOutboxReplayRepository,
    },
    {
      provide: SCENARIO_ORDER_CREATOR,
      useClass: NestOrdersScenarioClient,
    },
    OpsService,
    OpsLiveGateway,
    OutboxReplayService,
  ],
})
export class OpsModule {}
