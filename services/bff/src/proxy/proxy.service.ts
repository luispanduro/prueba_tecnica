import {
  Injectable,
  GatewayTimeoutException,
  HttpException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Request } from 'express';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ProxyResult {
  data: unknown;
  status: number;
}

@Injectable()
export class ProxyService {
  async forward(
    method: HttpMethod,
    targetUrl: string,
    req: Request,
    body?: unknown,
  ): Promise<ProxyResult> {
    const isAiRoute = targetUrl.includes('/ai/');
    const timeout = isAiRoute ? 35_000 : 10_000;

    const headers: Record<string, string> = {
      'X-Request-Timestamp': new Date().toISOString(),
    };

    const pick = (name: string) => {
      const val = req.headers[name.toLowerCase()];
      if (val) headers[name] = Array.isArray(val) ? val[0] : val;
    };

    pick('Authorization');
    pick('X-Correlation-Id');
    pick('X-User-Id');
    pick('X-User-Roles');
    pick('Content-Type');

    try {
      const response = await axios.request({
        method,
        url: targetUrl,
        headers,
        data: body,
        timeout,
      });
      return { data: response.data, status: response.status };
    } catch (error) {
      const err = error as AxiosError;

      if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
        throw new GatewayTimeoutException('Upstream service timed out');
      }
      if (err.response) {
        const { status, data } = err.response;
        const upstream = data as { message?: string; error?: string } | null;
        const message = upstream?.message ?? 'Upstream error';
        const errorText = upstream?.error ?? 'Upstream Error';
        throw new HttpException({ statusCode: status, error: errorText, message }, status);
      }
      throw new GatewayTimeoutException('Upstream service unavailable');
    }
  }
}
