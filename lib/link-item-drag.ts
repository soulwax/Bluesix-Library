export const LINK_ITEM_DRAG_MIME = "application/x-libbluesix-link-item";

export interface LinkItemDragPayload {
  itemId: string;
  linkId: string;
  sourceCategoryId: string;
  sourceCategoryName: string;
  sourceIndex: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function serializeLinkItemDragPayload(
  payload: LinkItemDragPayload,
): string {
  return JSON.stringify(payload);
}

export function parseLinkItemDragPayload(
  rawValue: string | null | undefined,
): LinkItemDragPayload | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<LinkItemDragPayload>;
    if (
      !isNonEmptyString(parsed.itemId) ||
      !isNonEmptyString(parsed.linkId) ||
      !isNonEmptyString(parsed.sourceCategoryId) ||
      !isNonEmptyString(parsed.sourceCategoryName) ||
      typeof parsed.sourceIndex !== "number" ||
      !Number.isFinite(parsed.sourceIndex)
    ) {
      return null;
    }

    return {
      itemId: parsed.itemId,
      linkId: parsed.linkId,
      sourceCategoryId: parsed.sourceCategoryId,
      sourceCategoryName: parsed.sourceCategoryName,
      sourceIndex: Math.max(0, Math.floor(parsed.sourceIndex)),
    };
  } catch {
    return null;
  }
}
