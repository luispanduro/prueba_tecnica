export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details: ErrorDetail[] | null;
  correlation_id: string | null;
  timestamp: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
}
