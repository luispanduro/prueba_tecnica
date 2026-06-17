import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class UserServiceClient {
  private readonly httpClient: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseUrl = this.config.get<string>('USER_SERVICE_URL', 'http://localhost:3002');

    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 5000, // 5 seconds timeout
    });
  }

  /**
   * Checks if a user exists by ID in User Service.
   * Returns true if the user exists, false if 404.
   * Throws ServiceUnavailableException if User Service is unreachable.
   */
  async userExists(userId: string): Promise<boolean> {
    try {
      await this.httpClient.get(`/users/${userId}`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return false;
        }
        throw new ServiceUnavailableException(
          'User Service is not available. Please try again later.',
        );
      }
      throw new ServiceUnavailableException(
        'User Service is not available. Please try again later.',
      );
    }
  }
}
