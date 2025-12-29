export interface ParseError {
  line: number;
  column?: number;
  message: string;
  type: "syntax" | "semantic" | "validation";
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  table?: string;
  column?: string;
  message: string;
  code?: string;
}

