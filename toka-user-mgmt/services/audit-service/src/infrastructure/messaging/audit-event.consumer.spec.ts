import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../domain/schemas/audit-log.schema';
import { AuditEventConsumer } from './audit-event.consumer';

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(() => ({
    createChannel: jest.fn(),
    on: jest.fn(),
  })),
}));

function makeConsumer(
  auditLogModel: Partial<Model<AuditLogDocument>>,
): AuditEventConsumer {
  const config = { get: jest.fn().mockReturnValue('amqp://localhost') } as unknown as ConfigService;
  const consumer = new AuditEventConsumer(
    config,
    auditLogModel as Model<AuditLogDocument>,
  );
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  return consumer;
}

function makeMsg(content: unknown, deathCount?: number) {
  return {
    content: Buffer.from(JSON.stringify(content)),
    properties: {
      headers: deathCount !== undefined
        ? { 'x-death': [{ count: deathCount }] }
        : {},
    },
  };
}

function makeChannel() {
  return {
    ack: jest.fn(),
    nack: jest.fn(),
  };
}

describe('AuditEventConsumer — onApplicationBootstrap', () => {
  it('creates channel, runs setup, and registers connection listeners', async () => {
    const { connect } = jest.requireMock('amqp-connection-manager') as {
      connect: jest.Mock;
    };

    const listeners: Record<string, (...args: unknown[]) => void> = {};
    let capturedSetup: ((ch: unknown) => Promise<void>) | undefined;

    const mockConnection = {
      createChannel: jest.fn(({ setup }: { setup: (ch: unknown) => Promise<void> }) => {
        capturedSetup = setup;
      }),
      on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = cb;
      }),
    };
    connect.mockReturnValue(mockConnection);

    const model = { findOne: jest.fn(), create: jest.fn() };
    const consumer = makeConsumer(model);
    consumer.onApplicationBootstrap();

    expect(connect).toHaveBeenCalled();
    expect(mockConnection.createChannel).toHaveBeenCalled();

    // Exercise the channel setup callback
    if (capturedSetup) {
      const mockCh = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        prefetch: jest.fn().mockResolvedValue(undefined),
        consume: jest.fn().mockResolvedValue(undefined),
      };
      await capturedSetup(mockCh);
      expect(mockCh.assertExchange).toHaveBeenCalledTimes(2);
      expect(mockCh.assertQueue).toHaveBeenCalledTimes(2);
      expect(mockCh.prefetch).toHaveBeenCalledWith(10);
    }

    // Exercise connection event listeners
    expect(listeners['connect']).toBeDefined();
    expect(listeners['disconnect']).toBeDefined();
    listeners['connect']();
    listeners['disconnect']({ err: new Error('disconnected') });
  });
});

describe('AuditEventConsumer — handleMessage', () => {
  let consumer: AuditEventConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ACKs and skips duplicate events (idempotency)', async () => {
    const model = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'existing' }),
        }),
      }),
      create: jest.fn(),
    };
    consumer = makeConsumer(model);
    const channel = makeChannel();
    const msg = makeMsg({
      eventId: 'dup-event',
      eventType: 'auth.user.logout',
      correlationId: 'corr',
    });

    await (consumer as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
      .handleMessage(channel, msg);

    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('saves audit log for a mapped event type', async () => {
    const model = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      }),
      create: jest.fn().mockResolvedValue({}),
    };
    consumer = makeConsumer(model);
    const channel = makeChannel();

    const event = {
      eventId: 'evt-1',
      eventType: 'auth.user.login.success',
      aggregateId: 'user-123',
      correlationId: 'corr-1',
      occurredAt: new Date().toISOString(),
      payload: { email: 'john@example.com', userId: 'user-123' },
    };
    const msg = makeMsg(event);

    await (consumer as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
      .handleMessage(channel, msg);

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-1',
        eventType: 'auth.user.login.success',
        service: 'auth-service',
        resourceType: 'session',
        action: 'login',
        status: 'success',
        actorEmail: 'john@example.com',
        userId: 'user-123',
      }),
    );
    expect(channel.ack).toHaveBeenCalled();
  });

  it('maps auth.user.login.failed to status failure', async () => {
    const model = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      }),
      create: jest.fn().mockResolvedValue({}),
    };
    consumer = makeConsumer(model);
    const channel = makeChannel();

    const msg = makeMsg({
      eventId: 'evt-fail',
      eventType: 'auth.user.login.failed',
      correlationId: 'corr',
      payload: {},
    });

    await (consumer as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
      .handleMessage(channel, msg);

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failure', action: 'login' }),
    );
  });

  it('ACKs unmapped event types without saving', async () => {
    const model = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      }),
      create: jest.fn(),
    };
    consumer = makeConsumer(model);
    const channel = makeChannel();

    const msg = makeMsg({
      eventId: 'evt-unknown',
      eventType: 'some.unknown.event',
      correlationId: 'corr',
    });

    await (consumer as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
      .handleMessage(channel, msg);

    expect(model.create).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalled();
  });

  it('NACKs with requeue when save fails and retry count < 3', async () => {
    const model = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      }),
      create: jest.fn().mockRejectedValue(new Error('DB error')),
    };
    consumer = makeConsumer(model);
    const channel = makeChannel();

    const msg = makeMsg(
      { eventId: 'evt-err', eventType: 'auth.user.logout', correlationId: 'corr', payload: {} },
      1,
    );

    await (consumer as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
      .handleMessage(channel, msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
  });

  it('NACKs without requeue (DLQ) after max retries', async () => {
    const model = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      }),
      create: jest.fn().mockRejectedValue(new Error('DB error')),
    };
    consumer = makeConsumer(model);
    const channel = makeChannel();

    const msg = makeMsg(
      { eventId: 'evt-dlq', eventType: 'auth.user.logout', correlationId: 'corr', payload: {} },
      3,
    );

    await (consumer as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
      .handleMessage(channel, msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });

  it('NACKs malformed message (missing eventId) without requeue', async () => {
    const model = { findOne: jest.fn(), create: jest.fn() };
    consumer = makeConsumer(model);
    const channel = makeChannel();

    const msg = makeMsg({ eventType: 'auth.user.logout' });

    await (consumer as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
      .handleMessage(channel, msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('maps all 12 event types correctly', async () => {
    const eventTypes = [
      ['auth.user.registered',     'auth-service',  'user',    'register',    'success'],
      ['auth.user.login.success',  'auth-service',  'session', 'login',       'success'],
      ['auth.user.login.failed',   'auth-service',  'session', 'login',       'failure'],
      ['auth.user.logout',         'auth-service',  'session', 'logout',      'success'],
      ['users.user.created',       'user-service',  'user',    'create',      'success'],
      ['users.user.updated',       'user-service',  'user',    'update',      'success'],
      ['users.user.deleted',       'user-service',  'user',    'delete',      'success'],
      ['users.user.role.assigned', 'user-service',  'user',    'assign_role', 'success'],
      ['users.user.role.removed',  'user-service',  'user',    'remove_role', 'success'],
      ['roles.role.created',       'role-service',  'role',    'create',      'success'],
      ['roles.role.updated',       'role-service',  'role',    'update',      'success'],
      ['roles.role.deleted',       'role-service',  'role',    'delete',      'success'],
    ];

    for (const [eventType, service, resourceType, action, status] of eventTypes) {
      const model = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        }),
        create: jest.fn().mockResolvedValue({}),
      };
      const c = makeConsumer(model);
      const ch = makeChannel();
      const msg = makeMsg({ eventId: `evt-${eventType}`, eventType, correlationId: 'corr', payload: {} });

      await (c as unknown as { handleMessage: (ch: unknown, msg: unknown) => Promise<void> })
        .handleMessage(ch, msg);

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ service, resourceType, action, status }),
      );
    }
  });
});
