export default () => ({
  rabbitmq: {
    host: process.env.RABBITMQ_HOST,
    port: Number(process.env.RABBITMQ_PORT),
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD,
    managementUrl: process.env.RABBITMQ_MANAGEMENT_URL,
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'orderflow.events',
    outboxPublisherEnabled:
      process.env.OUTBOX_PUBLISHER_ENABLED === undefined
        ? process.env.NODE_ENV !== 'test'
        : process.env.OUTBOX_PUBLISHER_ENABLED === 'true',
    outboxPollIntervalMs: Number(
      process.env.OUTBOX_PUBLISHER_POLL_INTERVAL_MS ?? 1000,
    ),
    outboxBatchSize: Number(process.env.OUTBOX_PUBLISHER_BATCH_SIZE ?? 20),
    consumersEnabled:
      process.env.RABBITMQ_CONSUMERS_ENABLED === undefined
        ? process.env.NODE_ENV !== 'test'
        : process.env.RABBITMQ_CONSUMERS_ENABLED === 'true',
    paymentsOrderCreatedQueue:
      process.env.RABBITMQ_PAYMENTS_ORDER_CREATED_QUEUE ??
      'payments.order-created.v1',
    ordersPaymentEventsQueue:
      process.env.RABBITMQ_ORDERS_PAYMENT_EVENTS_QUEUE ??
      'orders.payment-events.v1',
    ordersLifecycleEventsQueue:
      process.env.RABBITMQ_ORDERS_LIFECYCLE_EVENTS_QUEUE ??
      'orders.lifecycle-events.v1',
    enrollmentsPaymentSucceededQueue:
      process.env.RABBITMQ_ENROLLMENTS_PAYMENT_SUCCEEDED_QUEUE ??
      'enrollments.payment-succeeded.v1',
    paymentsRefundRequestedQueue:
      process.env.RABBITMQ_PAYMENTS_REFUND_REQUESTED_QUEUE ??
      'payments.refund-requested.v1',
  },
});
