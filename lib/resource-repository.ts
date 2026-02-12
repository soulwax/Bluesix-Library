import "server-only"

import { ensureSchema, getSql } from "@/lib/db"
import type { ResourceCard, ResourceInput, ResourceLink } from "@/lib/resources"

interface ResourceRow {
  id: string
  category: string
  links: ResourceLink[] | null
}

interface ResourceWriteRow extends ResourceRow {}

export class ResourceNotFoundError extends Error {
  constructor(id: string) {
    super(`Resource ${id} was not found.`)
    this.name = "ResourceNotFoundError"
  }
}

interface DbWriteLink {
  url: string
  label: string
  note: string | null
  position: number
}

function toDbWriteLinks(links: ResourceInput["links"]): DbWriteLink[] {
  return links.map((link, position) => ({
    url: link.url,
    label: link.label,
    note: link.note ?? null,
    position,
  }))
}

function normalizeRow(row: ResourceRow): ResourceCard {
  return {
    id: row.id,
    category: row.category,
    links: row.links ?? [],
  }
}

export async function listResources(): Promise<ResourceCard[]> {
  await ensureSchema()
  const sql = getSql()

  const rows = (await sql`
    SELECT
      rc.id,
      rc.category,
      COALESCE(
        json_agg(
          json_build_object(
            'id', rl.id,
            'url', rl.url,
            'label', rl.label,
            'note', rl.note
          )
          ORDER BY rl.position
        ) FILTER (WHERE rl.id IS NOT NULL),
        '[]'::json
      ) AS links
    FROM resource_cards rc
    LEFT JOIN resource_links rl ON rc.id = rl.resource_id
    GROUP BY rc.id, rc.category, rc.created_at
    ORDER BY rc.created_at DESC
  `) as ResourceRow[]

  return rows.map(normalizeRow)
}

export async function createResource(input: ResourceInput): Promise<ResourceCard> {
  await ensureSchema()
  const sql = getSql()

  const linksJson = JSON.stringify(toDbWriteLinks(input.links))

  const rows = (await sql`
    WITH new_card AS (
      INSERT INTO resource_cards (category)
      VALUES (${input.category})
      RETURNING id, category
    ),
    inserted_links AS (
      INSERT INTO resource_links (resource_id, url, label, note, position)
      SELECT
        nc.id,
        l.url,
        l.label,
        l.note,
        l.position
      FROM new_card nc,
      jsonb_to_recordset(${linksJson}::jsonb)
      AS l(url text, label text, note text, position integer)
      RETURNING id, url, label, note, position
    )
    SELECT
      nc.id,
      nc.category,
      COALESCE(
        json_agg(
          json_build_object(
            'id', il.id,
            'url', il.url,
            'label', il.label,
            'note', il.note
          )
          ORDER BY il.position
        ),
        '[]'::json
      ) AS links
    FROM new_card nc
    LEFT JOIN inserted_links il ON TRUE
    GROUP BY nc.id, nc.category
  `) as ResourceWriteRow[]

  return normalizeRow(rows[0])
}

export async function updateResource(
  id: string,
  input: ResourceInput
): Promise<ResourceCard> {
  await ensureSchema()
  const sql = getSql()

  const linksJson = JSON.stringify(toDbWriteLinks(input.links))

  const rows = (await sql`
    WITH updated_card AS (
      UPDATE resource_cards
      SET category = ${input.category}, updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, category
    ),
    deleted_links AS (
      DELETE FROM resource_links
      WHERE resource_id IN (SELECT id FROM updated_card)
    ),
    inserted_links AS (
      INSERT INTO resource_links (resource_id, url, label, note, position)
      SELECT
        uc.id,
        l.url,
        l.label,
        l.note,
        l.position
      FROM updated_card uc,
      jsonb_to_recordset(${linksJson}::jsonb)
      AS l(url text, label text, note text, position integer)
      RETURNING id, url, label, note, position
    )
    SELECT
      uc.id,
      uc.category,
      COALESCE(
        json_agg(
          json_build_object(
            'id', il.id,
            'url', il.url,
            'label', il.label,
            'note', il.note
          )
          ORDER BY il.position
        ),
        '[]'::json
      ) AS links
    FROM updated_card uc
    LEFT JOIN inserted_links il ON TRUE
    GROUP BY uc.id, uc.category
  `) as ResourceWriteRow[]

  if (rows.length === 0) {
    throw new ResourceNotFoundError(id)
  }

  return normalizeRow(rows[0])
}

export async function deleteResource(id: string): Promise<void> {
  await ensureSchema()
  const sql = getSql()

  const rows = (await sql`
    DELETE FROM resource_cards
    WHERE id = ${id}::uuid
    RETURNING id
  `) as { id: string }[]

  if (rows.length === 0) {
    throw new ResourceNotFoundError(id)
  }
}
