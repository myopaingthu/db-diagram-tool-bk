import * as dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/db-diagram",
  JWT_SECRET: process.env.JWT_SECRET || "default-secret",
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || "7d") as string,
  EMAIL_VERIFICATION_ENABLED: process.env.EMAIL_VERIFICATION_ENABLED === "true",
  PORT: parseInt(process.env.PORT || "3000", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  AI_PROVIDER: (process.env.AI_PROVIDER || "nvidia") as "nvidia" | "gemini",
  AI_MODEL: process.env.AI_MODEL || "moonshotai/kimi-k2.5",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  NVIDIA_API_BASE_URL:
    process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1",
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || "",
  AI_CHAT_MAX_MESSAGES: toNumber(process.env.AI_CHAT_MAX_MESSAGES, 40),
  AI_REQUEST_TIMEOUT_MS: toNumber(process.env.AI_REQUEST_TIMEOUT_MS, 45000),
  AI_TEMPERATURE: toNumber(process.env.AI_TEMPERATURE, 0.2),
  AI_REPAIR_TEMPERATURE: toNumber(process.env.AI_REPAIR_TEMPERATURE, 0),
  AI_TOP_P: toNumber(process.env.AI_TOP_P, 1),
  AI_ENABLE_THINKING: process.env.AI_ENABLE_THINKING === "true",
} as const;
