import { NextResponse } from "next/server"
import { z } from "zod"

import { MissingDatabaseEnvironmentError } from "@/lib/env"
import { deleteResource, ResourceNotFoundError, updateResource } from "@/lib/resource-repository"
import { parseResourceInput } from "@/lib/resource-validation"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }> | { id: string }
}

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

async function parseResourceId(context: RouteContext) {
  const params = await Promise.resolve(context.params)
  return z.string().uuid().parse(params.id)
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const resourceId = await parseResourceId(context)
    const payload = await readRequestJson(request)
    const input = parseResourceInput(payload)
    const resource = await updateResource(resourceId, input)

    return NextResponse.json({ resource })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const resourceId = await parseResourceId(context)
    await deleteResource(resourceId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
