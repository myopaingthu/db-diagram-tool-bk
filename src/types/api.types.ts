export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  error?: string;
  code?: number;
}

