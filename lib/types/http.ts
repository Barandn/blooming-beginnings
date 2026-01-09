/**
 * HTTP Request/Response Types
 * Platform-agnostic types for API handlers
 */

import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Extended HTTP Request with parsed body and query
 */
export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[]>;
}

/**
 * Extended HTTP Response with helper methods
 */
export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse;
  json(data: unknown): void;
  setHeader(name: string, value: string | number | readonly string[]): this;
}
