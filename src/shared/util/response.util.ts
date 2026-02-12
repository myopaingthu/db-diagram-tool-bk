import { ApiResponse } from "@src/types";

export class ResponseUtil {
  static success<T>(data: T, code?: number): ApiResponse<T> {
    return {
      status: true,
      data,
      code: code || 200,
    };
  }

  static error(error: string, code = 500): ApiResponse {
    return {
      status: false,
      error,
      code,
    };
  }
}

