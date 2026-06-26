import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roleIds: string[];
}

@Injectable()
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('USER_SERVICE_URL')!;
  }

  async getUserById(userId: string): Promise<UserDTO | null> {
    try {
      const response = await axios.get<UserDTO>(`${this.baseUrl}/users/${userId}`, {
        timeout: 3000,
      });
      return response.data;
    } catch {
      this.logger.warn({ action: 'user_service.unavailable', userId });
      return null;
    }
  }
}
