export interface User {
  _id?: string;
  email: string;
  password?: string;
  name: string;
  verified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  token: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

