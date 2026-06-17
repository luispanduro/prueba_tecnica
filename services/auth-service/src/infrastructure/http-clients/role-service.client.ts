import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class RoleServiceClient {
  private readonly httpClient: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseUrl = this.config.get<string>('ROLE_SERVICE_URL', 'http://localhost:3003');

    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 5000, // 5 seconds timeout as per design
    });
  }

  /**
   * Fetches the roles assigned to a user by their user ID.
   * Returns an empty array if the service is unavailable or the user has no roles.
   * Throws an error if the service is unreachable (caller must handle).
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const response = await this.httpClient.get<{ roles: string[] }>(
        `/roles/user/${userId}`,
      );
      return response.data.roles || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // User has no roles assigned
          return [];
        }
        // Service unavailable or timeout
        throw new Error(
          `Role Service unavailable: ${error.code || error.message}`,
        );
      }
      throw error;
    }
  }
}
