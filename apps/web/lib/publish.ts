/** When a guide becomes public. Pure clock math so tests and the site share one rule. */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** publish_at must carry a timezone (Z or ±hh:mm). A bare date belongs in `date`. */
const WITH_TZ = /(?:Z|[+-]\d{2}:\d{2})$/i;

export interface PublishFields {
  /** ISO 8601 with a timezone. Omitted means `date`. */
  publish_at?: string | null;
  /** Calendar day, YYYY-MM-DD. Used only when publish_at is absent. */
  date: string;
}

/**
 * Instant the article becomes visible.
 * - publish_at is parsed as an absolute instant (the offset is honored).
 * - A missing publish_at falls back to `date` at 00:00:00Z on that day, so the article is visible for the whole UTC day.
 */
export function publishTimeMs(input: PublishFields): number {
  const scheduled = input.publish_at?.trim() ?? "";
  if (scheduled) {
    if (!WITH_TZ.test(scheduled)) throw new Error(`publish_at must include a timezone: ${scheduled}`);
    const ms = Date.parse(scheduled);
    if (Number.isNaN(ms)) throw new Error(`publish_at is not a time: ${scheduled}`);
    return ms;
  }
  if (!DATE_ONLY.test(input.date)) throw new Error(`date must be YYYY-MM-DD when publish_at is omitted: ${input.date}`);
  return Date.parse(`${input.date}T00:00:00.000Z`);
}

/** True once `now` has reached the article's publish instant. Future articles are hidden everywhere. */
export function isPublished(input: PublishFields, now = Date.now()): boolean {
  return publishTimeMs(input) <= now;
}

export function publishedOnly<T extends PublishFields>(items: T[], now = Date.now()): T[] {
  return items.filter((item) => isPublished(item, now));
}
