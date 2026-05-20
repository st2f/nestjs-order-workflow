export default () => ({
  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME ?? process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD,
    name: process.env.DB_NAME ?? process.env.POSTGRES_DB,
    synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
    logging: process.env.TYPEORM_LOGGING === 'true',
  },
});
