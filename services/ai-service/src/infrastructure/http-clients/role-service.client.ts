import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { LoggerService } from '@user-management/shared';

export interface RoleData {
  id: string;
  name: string;
  description: string;
}

@Injectable()
export class RoleServiceClient {
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const baseUrl = this.config.get<string>('ROLE_SERVICE_URL', 'http://localhost:3003');
    this.httpClient = axios.create({ baseURL: baseUrl, timeout: 5000 });
  }

  async getRoles(): Promise<RoleData[]> {
    try {
      const response = await this.httpClient.get<RoleData[]>('/roles');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch roles from Role Service',
        error instanceof Error ? error.stack : undefined);
      throw new Error('Role Service unavailable');
    }
  }
}
