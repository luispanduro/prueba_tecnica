import { AuditEvent } from '../../../src/domain/entities/audit-event.entity';

describe('AuditEvent Entity', () => {
  const validProps = {
    eventType: 'user.created', actorId: 'a1', actorUsername: 'admin',
    resourceType: 'user', resourceId: 'r1', action: 'create',
    details: {}, ipAddress: '127.0.0.1', correlationId: 'c1',
    timestamp: new Date().toISOString(), serviceOrigin: 'user-service',
  };

  it('should create valid audit event', () => {
    const event = new AuditEvent(validProps);
    expect(event.eventType).toBe('user.created');
    expect(event.serviceOrigin).toBe('user-service');
  });

  it('should throw if eventType missing', () => {
    expect(() => new AuditEvent({ ...validProps, eventType: '' })).toThrow('eventType is required');
  });

  it('should throw if action missing', () => {
    expect(() => new AuditEvent({ ...validProps, action: '' })).toThrow('action is required');
  });

  it('should throw if serviceOrigin missing', () => {
    expect(() => new AuditEvent({ ...validProps, serviceOrigin: '' })).toThrow('serviceOrigin is required');
  });
});
