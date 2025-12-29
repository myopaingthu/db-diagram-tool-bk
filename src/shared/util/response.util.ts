import { ApiResponse } from "@src/types";

export class ResponseUtil {
  static success<T>(data: T, errorCode?: number): ApiResponse<T> {
    return {
      status: true,
      data,
      errorCode: errorCode || 200,
    };
  }

  static error(error: string, errorCode = 500): ApiResponse {
    return {
      status: false,
      error,
      errorCode,
    };
  }
}

