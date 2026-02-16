import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { ResourceCategoryAlreadyExistsError } from "@/lib/resource-repository"
import {
  createResourceCategoryService,
  listResourceCategoriesService,
} from "@/lib/resource-service"

export const runtime = "nodejs"

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
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
    const { mode, categories } = await listResourceCategoriesService()
    return NextResponse.json({ mode, categories })
  } catch {
    return errorResponse("Unexpected server error.", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }
    if (!session.user.isAdmin) {
      return errorResponse("Admin access required.", 403)
    }

    const payload = await readRequestJson(request)
    const input = createCategorySchema.parse(payload)
    const { mode, category } = await createResourceCategoryService(input.name)

    return NextResponse.json({ mode, category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid category payload.",
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    if (error instanceof ResourceCategoryAlreadyExistsError) {
      return errorResponse(error.message, 409)
    }

    return errorResponse("Unexpected server error.", 500)
  }
}

