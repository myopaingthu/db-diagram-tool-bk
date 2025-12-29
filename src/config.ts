import * as dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/db-diagram",
  JWT_SECRET: process.env.JWT_SECRET || "default-secret",
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || "7d") as string,
  EMAIL_VERIFICATION_ENABLED: process.env.EMAIL_VERIFICATION_ENABLED === "true",
  PORT: parseInt(process.env.PORT || "3000", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
} as const;

