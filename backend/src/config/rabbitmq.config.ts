export default () => ({
  rabbitmq: {
    host: process.env.RABBITMQ_HOST,
    port: Number(process.env.RABBITMQ_PORT),
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD,
    managementUrl: process.env.RABBITMQ_MANAGEMENT_URL,
  },
});
