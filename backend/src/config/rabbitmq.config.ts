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
  },
});
