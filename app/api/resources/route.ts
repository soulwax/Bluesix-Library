import { NextResponse } from "next/server"
import { z } from "zod"

import { MissingDatabaseEnvironmentError } from "@/lib/env"
import { createResource, listResources, ResourceNotFoundError } from "@/lib/resource-repository"
import { parseResourceInput } from "@/lib/resource-validation"

export const runtime = "nodejs"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function handleRouteError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: error.flatten(),
      },
      { status: 400 }
    )
  }

  if (error instanceof MissingDatabaseEnvironmentError) {
    return errorResponse(error.message, 500)
  }

  if (error instanceof ResourceNotFoundError) {
    return errorResponse(error.message, 404)
  }

  return errorResponse("Unexpected server error.", 500)
}

async function readRequestJson(request: Request): Promise<unknown> {
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

export async function GET() {
  try {
    const resources = await listResources()
    return NextResponse.json({ resources })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readRequestJson(request)
    const input = parseResourceInput(payload)
    const resource = await createResource(input)

    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
