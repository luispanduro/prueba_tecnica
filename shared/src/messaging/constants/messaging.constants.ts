/**
 * RabbitMQ exchange and routing key constants for auditing.
 */

// Exchange
export const AUDIT_EXCHANGE = 'audit.events';
export const AUDIT_EXCHANGE_TYPE = 'topic';

// Routing keys
export const ROUTING_KEYS = {
  AUTH_LOGIN: 'audit.auth.login',
  AUTH_LOGIN_FAILED: 'audit.auth.login_failed',
  AUTH_ACCESS_DENIED: 'audit.auth.access_denied',
  USER_CREATED: 'audit.user.created',
  USER_UPDATED: 'audit.user.updated',
  USER_DELETED: 'audit.user.deleted',
  ROLE_CREATED: 'audit.role.created',
  ROLE_DELETED: 'audit.role.deleted',
  ROLE_ASSIGNED: 'audit.role.assigned',
  ROLE_UNASSIGNED: 'audit.role.unassigned',
  AI_QUERY: 'audit.ai.query',
  AI_INDEXED: 'audit.ai.indexed',
} as const;

// Queue names (for future consumer setup)
export const QUEUES = {
  AUTH: 'audit.auth.queue',
  USER: 'audit.user.queue',
  ROLE: 'audit.role.queue',
  AI: 'audit.ai.queue',
} as const;

// Queue binding patterns
export const QUEUE_BINDINGS = {
  [QUEUES.AUTH]: 'audit.auth.*',
  [QUEUES.USER]: 'audit.user.*',
  [QUEUES.ROLE]: 'audit.role.*',
  [QUEUES.AI]: 'audit.ai.*',
} as const;
