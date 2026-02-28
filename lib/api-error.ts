import { NextResponse } from "next/server"

import { z } from "zod"

export const API_ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

export type ApiErrorResponseBody<
  Code extends string = ApiErrorCode,
  Details = unknown,
> = {
  ok: false
  error: string
  code: Code
  details?: Details
}

function mapStatusToErrorCode(status: number): ApiErrorCode {
  if (status === 400) {
    return API_ERROR_CODES.BAD_REQUEST
  }
  if (status === 401) {
    return API_ERROR_CODES.UNAUTHORIZED
  }
  if (status === 403) {
    return API_ERROR_CODES.FORBIDDEN
  }
  if (status === 404) {
    return API_ERROR_CODES.NOT_FOUND
  }
  if (status === 409) {
    return API_ERROR_CODES.CONFLICT
  }
  if (status === 429) {
    return API_ERROR_CODES.RATE_LIMITED
  }
  return API_ERROR_CODES.INTERNAL_ERROR
}

export function createApiErrorResponse<Code extends string = ApiErrorCode>(options: {
  message: string
  status: number
  code?: Code
  details?: unknown
  headers?: HeadersInit
}) {
  const body: ApiErrorResponseBody<Code> = {
    ok: false,
    error: options.message,
    code: options.code ?? (mapStatusToErrorCode(options.status) as Code),
  }

  if (typeof options.details !== "undefined") {
    body.details = options.details
  }

  return NextResponse.json(body, {
    status: options.status,
    headers: options.headers,
  })
}

export function createValidationErrorResponse(
  error: z.ZodError,
  message = "Invalid request payload.",
) {
  return createApiErrorResponse({
    message,
    status: 400,
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details: error.flatten(),
  })
}

export async function readRequestJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        path: [],
        message: "Request body must be valid JSON.",
      },
    ])
  }
}
