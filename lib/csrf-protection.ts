import "server-only";

/**
 * CSRF Protection Utility
 *
 * Validates that state-changing requests (POST, PUT, PATCH, DELETE) originate
 * from the same site by checking the Origin and Referer headers.
 *
 * This provides defense-in-depth against CSRF attacks, complementing NextAuth's
 * built-in CSRF protection and SameSite cookie attributes.
 */

export class CSRFValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CSRFValidationError";
  }
}

/**
 * Get the list of allowed origins for CSRF validation.
 * In production, this should match your deployment URL(s).
 * In development, allows localhost on any port.
 */
function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Production URLs
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    try {
      const url = new URL(nextAuthUrl);
      origins.add(url.origin);
    } catch {
      // Invalid URL, skip
    }
  }

  // Additional production domains
  const productionDomains = [
    "https://nandcore.com",
    "https://www.nandcore.com",
  ];
  productionDomains.forEach((domain) => origins.add(domain));

  // Development mode: allow localhost
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    // Allow any localhost port for development flexibility
    origins.add("http://localhost");
    origins.add("http://127.0.0.1");
  }

  return origins;
}

/**
 * Check if the origin matches any allowed origins.
 * For development localhost origins, allows any port.
 */
function isOriginAllowed(origin: string, allowedOrigins: Set<string>): boolean {
  // Exact match
  if (allowedOrigins.has(origin)) {
    return true;
  }

  // Development: allow localhost with any port
  if (process.env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      if (
        url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Validate CSRF protection for a request.
 *
 * State-changing methods (POST, PUT, PATCH, DELETE) must have a valid
 * Origin or Referer header matching an allowed origin.
 *
 * Safe methods (GET, HEAD, OPTIONS) are allowed without validation.
 *
 * @throws {CSRFValidationError} if validation fails
 */
export function validateCSRF(request: Request): void {
  const method = request.method.toUpperCase();

  // Safe methods don't need CSRF protection
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return;
  }

  // State-changing methods require CSRF validation
  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Check Origin header first (more reliable)
  if (origin) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      return;
    }
    throw new CSRFValidationError(
      `CSRF validation failed: Origin '${origin}' is not allowed`
    );
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (isOriginAllowed(refererOrigin, allowedOrigins)) {
        return;
      }
      throw new CSRFValidationError(
        `CSRF validation failed: Referer origin '${refererOrigin}' is not allowed`
      );
    } catch (error) {
      if (error instanceof CSRFValidationError) {
        throw error;
      }
      throw new CSRFValidationError(
        "CSRF validation failed: Invalid Referer header"
      );
    }
  }

  // Neither Origin nor Referer present
  throw new CSRFValidationError(
    "CSRF validation failed: Missing Origin and Referer headers"
  );
}

/**
 * Wrapper for API route handlers that adds CSRF protection.
 *
 * Usage:
 * ```typescript
 * export const POST = withCSRFProtection(async (request: Request) => {
 *   // Your handler logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCSRFProtection(
  handler: (request: Request, ...args: any[]) => Promise<Response>
): (request: Request, ...args: any[]) => Promise<Response> {
  return async (request: Request, ...args: any[]) => {
    try {
      validateCSRF(request);
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof CSRFValidationError) {
        console.error("[CSRF] Validation failed:", error.message);
        return new Response(
          JSON.stringify({ error: "Invalid request origin" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }
  };
}
