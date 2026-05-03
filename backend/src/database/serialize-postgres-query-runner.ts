import { PostgresQueryRunner } from 'typeorm/driver/postgres/PostgresQueryRunner';

type QueryMethod = PostgresQueryRunner['query'];
type SerializedPostgresQueryRunner = PostgresQueryRunner & {
  __orderflowQueryQueue?: Promise<unknown>;
};

const prototype =
  PostgresQueryRunner.prototype as SerializedPostgresQueryRunner;
const originalQuery = Reflect.get(prototype, 'query');

if (!Reflect.get(prototype, '__orderflowSerializesQueries')) {
  Reflect.set(prototype, '__orderflowSerializesQueries', true);

  // TypeORM schema sync performs parallel metadata reads through one pg client.
  // pg@8.20 warns about that because pg@9 will require one in-flight query per client.
  // Temporary compatibility patch for pg@8.20 / TypeORM schema sync.
  // Remove when TypeORM/pg handles this natively or when schema sync is removed.
  prototype.query = function serializedQuery(
    this: SerializedPostgresQueryRunner,
    ...args: Parameters<QueryMethod>
  ): ReturnType<QueryMethod> {
    const previousQuery = this.__orderflowQueryQueue ?? Promise.resolve();

    const currentQuery: Promise<unknown> = previousQuery.then(() =>
      Reflect.apply(originalQuery, this, args),
    );

    this.__orderflowQueryQueue = currentQuery.catch(() => undefined);

    return currentQuery as ReturnType<QueryMethod>;
  };
}
