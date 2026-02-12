import { Request } from "express";
import type { JwtPayload } from "@src/types";

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
