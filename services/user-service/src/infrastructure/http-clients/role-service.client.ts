import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import CircuitBreaker = require('opossum');

@Injectable()
export class RoleServiceClient {
  private readonly logger = new Logger(RoleServiceClient.name);
  private readonly breaker: CircuitBreaker;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('ROLE_SERVICE_URL') ?? 'http://role-service:3003';

    this.breaker = new CircuitBreaker(this.fetchRole.bind(this), {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    });

    this.breaker.fallback(() => {
      throw new ServiceUnavailableException('Role Service unavailable');
    });

    this.breaker.on('open', () => {
      this.logger.warn({
        action: 'circuit_breaker.opened',
        service: 'role-service',
      });
    });
  }

  async roleExists(roleId: string): Promise<boolean> {
    return this.breaker.fire(roleId) as Promise<boolean>;
  }

  private async fetchRole(roleId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/internal/roles/${roleId}`,
        { timeout: 3000 },
      );
      return response.status === 200;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }
}
