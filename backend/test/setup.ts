import { randomUUID } from 'crypto';
import { config as loadEnvFile } from 'dotenv';
import 'reflect-metadata';

loadEnvFile({
  path: '../.env',
  quiet: true,
});
loadEnvFile({
  path: '.env.test',
  quiet: true,
});

setFromFallback('DB_USERNAME', 'POSTGRES_USER');
setFromFallback('DB_PASSWORD', 'POSTGRES_PASSWORD');
setFromFallback('DB_NAME', 'POSTGRES_DB');
setFromFallback('RABBITMQ_USERNAME', 'RABBITMQ_DEFAULT_USER');
setFromFallback('RABBITMQ_PASSWORD', 'RABBITMQ_DEFAULT_PASS');

setIfBlank('DB_HOST', 'localhost');
setIfBlank('DB_PORT', '5432');
setIfBlank('DB_NAME', 'orderflow_test');
setIfBlank('TYPEORM_SYNCHRONIZE', 'true');
setIfBlank('TYPEORM_LOGGING', 'false');
setIfBlank('RABBITMQ_HOST', 'localhost');
setIfBlank('RABBITMQ_PORT', '5672');
setIfBlank('RABBITMQ_MANAGEMENT_URL', 'http://localhost:15672');
setGeneratedIfBlank('ADMIN_USERNAME', 'test-admin');
setGeneratedIfBlank('ADMIN_PASSWORD', 'test-admin-password');
setGeneratedIfBlank('JWT_SECRET', 'test-jwt-secret');
setGeneratedIfBlank('RABBITMQ_USERNAME', 'test-rabbitmq-user');
setGeneratedIfBlank('RABBITMQ_PASSWORD', 'test-rabbitmq-password');

function setFromFallback(name: string, fallbackName: string) {
  if (hasValue(name)) {
    return;
  }

  const fallbackValue = process.env[fallbackName];

  if (fallbackValue?.trim()) {
    process.env[name] = fallbackValue;
  }
}

function setGeneratedIfBlank(name: string, prefix: string) {
  if (!hasValue(name)) {
    process.env[name] = `${prefix}-${randomUUID()}`;
  }
}

function setIfBlank(name: string, value: string) {
  if (!hasValue(name)) {
    process.env[name] = value;
  }
}

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}
