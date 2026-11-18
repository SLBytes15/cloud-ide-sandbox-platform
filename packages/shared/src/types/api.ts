export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  database: {
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    name?: string;
  };
}
