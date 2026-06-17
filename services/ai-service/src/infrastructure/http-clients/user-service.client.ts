import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { LoggerService } from '@user-management/shared';

export interface UserContextData {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

@Injectable()
export class UserServiceClient {
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const baseUrl = this.config.get<string>('USER_SERVICE_URL', 'http://localhost:3002');
    this.httpClient = axios.create({ baseURL: baseUrl, timeout: 5000 });
  }

  async getContextData(): Promise<UserContextData[]> {
    try {
      const response = await this.httpClient.get<UserContextData[]>('/users/context');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch user context data from User Service',
        error instanceof Error ? error.stack : undefined);
      throw new Error('User Service unavailable');
    }
  }
}
