import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { LoggerService } from '@user-management/shared';

export interface CreateCredentialsRequest {
  userId: string;
  username: string;
  email: string;
  password: string;
}

@Injectable()
export class AuthServiceClient {
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const baseUrl = this.config.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001');
    this.httpClient = axios.create({ baseURL: baseUrl, timeout: 5000 });
  }

  /**
   * Creates credentials for a user in Auth Service.
   * Requires a valid admin JWT token for authorization.
   */
  async createCredentials(data: CreateCredentialsRequest, jwtToken: string): Promise<void> {
    try {
      await this.httpClient.post('/auth/internal/credentials', data, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          // Credentials already exist — not necessarily an error in idempotent flows
          this.logger.warn('Credentials already exist in Auth Service', {
            userId: data.userId,
            username: data.username,
          });
          return;
        }
        this.logger.error('Failed to create credentials in Auth Service', undefined, {
          status: error.response?.status,
          userId: data.userId,
        });
        throw new ServiceUnavailableException(
          'Unable to create authentication credentials. Please try again later.',
        );
      }
      throw new ServiceUnavailableException(
        'Auth Service is not available. Please try again later.',
      );
    }
  }
}
