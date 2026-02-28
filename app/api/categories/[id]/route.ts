import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { CSRFValidationError, validateCSRF } from "@/lib/csrf-protection"
import {
  asRateLimitJsonResponse,
  assertRequestRateLimit,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit"
import {
  ResourceCategoryAlreadyExistsError,
  ResourceCategoryNotFoundError,
} from "@/lib/resource-repository"
import {
  deleteResourceCategoryService,
  listResourceCategoriesService,
  updateResourceCategoryService,
} from "@/lib/resource-service"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }> | { id: string }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function parseCategoryId(context: RouteContext) {
  const params = await Promise.resolve(context.params)
  return z.string().uuid().parse(params.id)
}

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    symbol: z.string().trim().max(16).nullable().optional(),
  })
  .refine((input) => input.name !== undefined || input.symbol !== undefined, {
    message: "At least one editable field is required.",
  })

export async function DELETE(request: Request, context: RouteContext) {
  try {
    validateCSRF(request)

    const session = await auth()
    await assertRequestRateLimit(request, RATE_LIMIT_RULES.WRITE_REQUESTS, {
      userId: session?.user?.id ?? null,
      message: "Too many write actions. Please slow down and try again.",
    })
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }
    if (!session.user.isAdmin) {
      return errorResponse("Admin access required.", 403)
    }

    const categoryId = await parseCategoryId(context)
    const result = await deleteResourceCategoryService(categoryId, {
      actorUserId: session.user.id,
      includeAllWorkspaces: session.user.isFirstAdmin === true,
    })
    return NextResponse.json(result)
  } catch (error) {
    const rateLimited = asRateLimitJsonResponse(error)
    if (rateLimited) {
      return rateLimited
    }

    if (error instanceof CSRFValidationError) {
      return errorResponse("Invalid request origin.", 403)
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid category identifier.",
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    if (error instanceof ResourceCategoryNotFoundError) {
      return errorResponse(error.message, 404)
    }

    return errorResponse("Unexpected server error.", 500)
  }
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

async function userOwnsCategory(categoryId: string, userId: string) {
  const { categories } = await listResourceCategoriesService({
    userId,
    includeAllWorkspaces: false,
  })

  return categories.some(
    (category) => category.id === categoryId && category.ownerUserId === userId
  )
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    validateCSRF(request)

    const session = await auth()
    await assertRequestRateLimit(request, RATE_LIMIT_RULES.WRITE_REQUESTS, {
      userId: session?.user?.id ?? null,
      message: "Too many write actions. Please slow down and try again.",
    })
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }
    const categoryId = await parseCategoryId(context)

    if (
      !session.user.isAdmin &&
      !(await userOwnsCategory(categoryId, session.user.id))
    ) {
      return errorResponse("Insufficient permissions for editing this category.", 403)
    }

    const payload = await readRequestJson(request)
    const input = updateCategorySchema.parse(payload)
    const { mode, category } = await updateResourceCategoryService(
      categoryId,
      {
        name: input.name,
        symbol: input.symbol,
      },
      {
        actorUserId: session.user.id,
        includeAllWorkspaces: session.user.isFirstAdmin === true,
      }
    )

    return NextResponse.json({ mode, category })
  } catch (error) {
    const rateLimited = asRateLimitJsonResponse(error)
    if (rateLimited) {
      return rateLimited
    }

    if (error instanceof CSRFValidationError) {
      return errorResponse("Invalid request origin.", 403)
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid category payload.",
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    if (error instanceof ResourceCategoryNotFoundError) {
      return errorResponse(error.message, 404)
    }

    if (error instanceof ResourceCategoryAlreadyExistsError) {
      return errorResponse(error.message, 409)
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
