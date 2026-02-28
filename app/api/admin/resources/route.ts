import { NextResponse } from "next/server"
import { createApiErrorResponse } from "@/lib/api-error"

import { auth } from "@/auth";
import { listResourcesIncludingDeletedService } from "@/lib/resource-service";

export const runtime = "nodejs";

function errorResponse(
  message: string,
  status: number,
  options?: {
    code?: string
    details?: unknown
    headers?: HeadersInit
  },
) {
  return createApiErrorResponse({
    message,
    status,
    code: options?.code,
    details: options?.details,
    headers: options?.headers,
  })
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Authentication required.", 401);
  }

  if (!session.user.isAdmin) {
    return errorResponse("Admin access required.", 403);
  }

  try {
    const { mode, resources } = await listResourcesIncludingDeletedService();
    return NextResponse.json({ mode, resources });
  } catch (error) {
    console.error("Error in /api/admin/resources GET handler:", error);
    return errorResponse("Unexpected server error.", 500);
  }
}
