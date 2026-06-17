/**
 * Domain entity representing an audit event.
 */
export class AuditEvent {
  readonly eventType: string;
  readonly actorId: string;
  readonly actorUsername: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly action: string;
  readonly details: Record<string, unknown>;
  readonly ipAddress: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly serviceOrigin: string;

  constructor(props: {
    eventType: string;
    actorId: string;
    actorUsername: string;
    resourceType: string;
    resourceId: string | null;
    action: string;
    details: Record<string, unknown>;
    ipAddress: string;
    correlationId: string;
    timestamp: string;
    serviceOrigin: string;
  }) {
    if (!props.eventType) throw new Error('eventType is required');
    if (!props.action) throw new Error('action is required');
    if (!props.serviceOrigin) throw new Error('serviceOrigin is required');

    this.eventType = props.eventType;
    this.actorId = props.actorId;
    this.actorUsername = props.actorUsername;
    this.resourceType = props.resourceType;
    this.resourceId = props.resourceId;
    this.action = props.action;
    this.details = props.details || {};
    this.ipAddress = props.ipAddress;
    this.correlationId = props.correlationId;
    this.timestamp = props.timestamp;
    this.serviceOrigin = props.serviceOrigin;
  }
}
