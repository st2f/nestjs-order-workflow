# Prepare for microservices

Make the module boundaries strict enough that splitting later into services is mostly extraction, not surgery.

1. **Enforce “own your own tables”**
   - `orders` writes only `orders`
   - `payments` writes only `payments`
   - `enrollments` writes only `enrollments`
   - `notifications` writes only `notifications`
   - `events` writes only `outbox_events` / `processed_events`

   Other modules can react to events, but should not directly mutate another module’s tables.

2. **Avoid cross-module TypeORM relations**

   Right now `Payment` and `Enrollment` import `Order` and use `@ManyToOne`.

   That is convenient, but it creates a database/code coupling that is painful to split later.

   For future microservices, prefer:

   ```ts
   @Column({ name: 'order_id', type: 'uuid' })
   orderId!: string;
   ```

   without:

   ```ts
   @ManyToOne(() => Order)
   order!: Order;
   ```

   Keep `orderId` as a plain external reference. In a real split, `payments` would not have an ORM relation to the `orders` database.

3. **Communicate only through events between domains**

   Example:
   - `orders` emits `order.created`
   - `payments` consumes it and emits `payment.succeeded`
   - `orders` consumes `payment.succeeded` and updates order state
   - `enrollments` consumes `payment.succeeded` and emits `enrollment.granted`

   Avoid direct service calls like:

   ```ts
   this.paymentsService.createPayment(order);
   ```

   from `orders`, unless it is behind an application-level orchestration boundary you plan to delete later.

4. **Create explicit public interfaces per module**

   Inside each module, separate internal code from what other modules may use.

   A useful structure:

   ```txt
   src/orders/
     application/
     domain/
     infrastructure/
     contracts/
       events.ts
       dto.ts
     orders.module.ts
   ```

   `contracts/` is the only folder other modules should import from.

5. **Treat event payloads as API contracts**

   Version them early, even simply:

   ```ts
   export type OrderCreatedV1 = {
     eventId: string;
     type: 'order.created';
     version: 1;
     occurredAt: string;
     data: {
       orderId: string;
       userId: string;
       courseId: string;
       amount: string;
     };
   };
   ```

   Later, if `payments` becomes its own service, this event contract is already the service boundary.

6. **Use the outbox as the only cross-boundary trigger**

   When `orders` creates an order, it should write:
   - the `orders` row
   - the `outbox_events` row

   in the same transaction.

   Then a publisher sends the event to RabbitMQ. This makes the future split much closer to real production behavior.

7. **Keep idempotency per consumer**

   The `processed_events` table is exactly the right idea.

   Make every consumer follow this pattern:
   - receive event
   - check `(eventId, consumer)`
   - if already processed, ack/skip
   - otherwise process inside a transaction
   - insert processed marker

8. **Do not share business enums too casually**

   Shared enums feel harmless, but they couple services.

   This is okay:

   ```ts
   orders / order - status.enum.ts;
   ```

   But avoid `payments` depending on `OrderStatus`. `payments` should care about events like `order.created`, not the full internal order lifecycle.

9. **Use module-level repositories/services**
   Avoid injecting raw repositories from another module.

   Good:

   ```ts
   OrdersService updates Order
   PaymentsService updates Payment
   ```

   Risky:

   ```ts
   PaymentsService injects Order repository
   ```

10. **Keep debug/ops separate**

    Let the planned `ops` module inspect across modules for demo/debug purposes, but do not let normal business logic depend on `ops`.
