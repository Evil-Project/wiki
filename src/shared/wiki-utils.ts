import type { WikiPage, WikiRevision, WikiSearchResult } from "./wiki-types";

export function slugifyTitle(title: string): string {
  const normalized = title.trim().replace(/[_\s]+/g, "_");

  return encodeURIComponent(normalized || "Untitled");
}

export function titleFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/_/g, " ");
}

export function normalizeList(items: string[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function extractWikiLinks(content: string): string[] {
  const matches = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);

  return normalizeList(Array.from(matches, (match) => slugifyTitle(match[1])));
}

export function stripHtml(content: string): string {
  return content
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2 $1")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeRevisionId(slug: string, createdAt: string): string {
  return `${slug}-${createdAt.replace(/[^0-9]/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createPageSnapshot(input: {
  slug: string;
  title: string;
  content: string;
  categories: string[];
  tags: string[];
  author?: string;
  note?: string;
  previous?: WikiPage;
}): { page: WikiPage; revision: WikiRevision } {
  const createdAt = new Date().toISOString();
  const links = extractWikiLinks(input.content);
  const categories = normalizeList(input.categories);
  const tags = normalizeList(input.tags);
  const revisionId = makeRevisionId(input.slug, createdAt);

  return {
    page: {
      slug: input.slug,
      title: input.title.trim(),
      content: input.content,
      categories,
      tags,
      links,
      createdAt: input.previous?.createdAt ?? createdAt,
      updatedAt: createdAt,
      revisionId,
    },
    revision: {
      id: revisionId,
      pageSlug: input.slug,
      title: input.title.trim(),
      content: input.content,
      categories,
      tags,
      links,
      createdAt,
      author: input.author?.trim() || "Editor",
      note: input.note?.trim() || "Saved revision",
    },
  };
}

export function summarizeSearch(page: WikiPage, query: string): WikiSearchResult {
  const text = stripHtml(page.content);
  const loweredText = text.toLowerCase();
  const loweredQuery = query.toLowerCase();
  const index = Math.max(0, loweredText.indexOf(loweredQuery));
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + query.length + 120);

  return {
    slug: page.slug,
    title: page.title,
    snippet: text.slice(start, end) || text.slice(0, 180),
    updatedAt: page.updatedAt,
    categories: page.categories,
  };
}
