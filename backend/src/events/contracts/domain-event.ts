export type DomainEvent<
  TEventType extends string,
  TVersion extends number,
  TData extends Record<string, unknown>,
> = {
  eventId: string;
  eventType: TEventType;
  version: TVersion;
  occurredAt: string;
  correlationId: string;
  data: TData;
};
