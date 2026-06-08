import {
  createPageSnapshot,
  slugifyTitle,
  summarizeSearch,
  titleFromSlug,
} from "../shared/wiki-utils";
import type { KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import type {
  WikiCategorySummary,
  WikiFile,
  WikiFileInput,
  WikiPage,
  WikiPageInput,
  WikiRevision,
} from "../shared/wiki-types";

interface Env {
  WIKI_KV: KVNamespace;
  WIKI_FILES?: R2Bucket;
  EDIT_TOKEN?: string;
}

const pagePrefix = "page:";
const revisionPrefix = "revision:";
const filePrefix = "file:";

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
}

function notFound(message = "Not found"): Response {
  return json({ error: message }, { status: 404 });
}

function assertToken(request: Request, env: Env): Response | null {
  if (!env.EDIT_TOKEN) {
    return null;
  }

  const token = request.headers.get("x-wiki-token");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (token === env.EDIT_TOKEN || bearer === env.EDIT_TOKEN) {
    return null;
  }

  return json({ error: "Edit token required" }, { status: 401 });
}

async function readJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const value = await kv.get(key, "json");

  return value as T | null;
}

async function writeJson(kv: KVNamespace, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}

async function listValues<T>(kv: KVNamespace, prefix: string): Promise<T[]> {
  const values: T[] = [];
  let cursor: string | undefined;

  do {
    const page = await kv.list({ prefix, cursor });
    const entries = await Promise.all(page.keys.map((key) => readJson<T>(kv, key.name)));

    for (const entry of entries) {
      if (entry) {
        values.push(entry);
      }
    }

    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return values;
}

function visiblePages(pages: WikiPage[]): WikiPage[] {
  return pages.filter((page) => !page.deletedAt);
}

async function getPage(env: Env, slug: string): Promise<WikiPage | null> {
  const page = await readJson<WikiPage>(env.WIKI_KV, `${pagePrefix}${slug}`);

  return page && !page.deletedAt ? page : null;
}

async function listPages(env: Env): Promise<WikiPage[]> {
  const pages = await listValues<WikiPage>(env.WIKI_KV, pagePrefix);

  return visiblePages(pages).sort((left, right) => left.title.localeCompare(right.title));
}

async function savePage(env: Env, input: WikiPageInput, slug = slugifyTitle(input.title)): Promise<WikiPage> {
  const previous = await readJson<WikiPage>(env.WIKI_KV, `${pagePrefix}${slug}`);
  const { page, revision } = createPageSnapshot({
    slug,
    title: input.title || titleFromSlug(slug),
    content: input.content,
    categories: input.categories,
    tags: input.tags,
    author: input.author,
    note: input.note,
    previous: previous ?? undefined,
  });

  await writeJson(env.WIKI_KV, `${pagePrefix}${slug}`, page);
  await writeJson(env.WIKI_KV, `${revisionPrefix}${slug}:${revision.id}`, revision);

  return page;
}

async function deletePage(env: Env, slug: string): Promise<Response> {
  const page = await getPage(env, slug);

  if (!page) {
    return notFound("Page not found");
  }

  await writeJson(env.WIKI_KV, `${pagePrefix}${slug}`, {
    ...page,
    deletedAt: new Date().toISOString(),
  });

  return json({ ok: true });
}

async function listRevisions(env: Env, slug: string): Promise<WikiRevision[]> {
  const revisions = await listValues<WikiRevision>(env.WIKI_KV, `${revisionPrefix}${slug}:`);

  return revisions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function handleFiles(request: Request, env: Env, parts: string[]): Promise<Response> {
  if (request.method === "GET" && parts.length === 1) {
    const files = await listValues<WikiFile>(env.WIKI_KV, filePrefix);

    return json(files.sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
  }

  if (request.method === "POST" && parts.length === 1) {
    const auth = assertToken(request, env);

    if (auth) {
      return auth;
    }

    const input = (await request.json()) as WikiFileInput;
    const id = crypto.randomUUID();
    const metadata: WikiFile = {
      id,
      name: input.name,
      type: input.type,
      size: input.size,
      alt: input.alt,
      createdAt: new Date().toISOString(),
      url: `/api/files/${id}/content`,
    };

    if (env.WIKI_FILES) {
      const body = input.dataUrl.split(",").at(1) ?? "";
      await env.WIKI_FILES.put(id, Uint8Array.from(atob(body), (char) => char.charCodeAt(0)), {
        httpMetadata: { contentType: input.type },
      });
    } else {
      metadata.dataUrl = input.dataUrl;
    }

    await writeJson(env.WIKI_KV, `${filePrefix}${id}`, metadata);

    return json(metadata, { status: 201 });
  }

  const fileId = parts[1];

  if (!fileId) {
    return notFound("File not found");
  }

  if (request.method === "GET" && parts[2] === "content") {
    const metadata = await readJson<WikiFile>(env.WIKI_KV, `${filePrefix}${fileId}`);

    if (!metadata) {
      return notFound("File not found");
    }

    if (metadata.dataUrl) {
      const body = metadata.dataUrl.split(",").at(1) ?? "";

      return new Response(Uint8Array.from(atob(body), (char) => char.charCodeAt(0)), {
        headers: { "content-type": metadata.type },
      });
    }

    const object = await env.WIKI_FILES?.get(fileId);

    if (!object) {
      return notFound("File content not found");
    }

    return new Response(await object.arrayBuffer(), {
      headers: { "content-type": object.httpMetadata?.contentType ?? metadata.type },
    });
  }

  if (request.method === "DELETE") {
    const auth = assertToken(request, env);

    if (auth) {
      return auth;
    }

    await env.WIKI_KV.delete(`${filePrefix}${fileId}`);
    await env.WIKI_FILES?.delete(fileId);

    return json({ ok: true });
  }

  return notFound("File route not found");
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/api/health") {
    return json({ ok: true, storage: "cloudflare-kv" });
  }

  if (parts[0] !== "api") {
    return notFound("API route not found");
  }

  if (parts[1] === "files") {
    return handleFiles(request, env, parts.slice(1));
  }

  if (request.method === "GET" && parts[1] === "pages" && parts.length === 2) {
    return json(await listPages(env));
  }

  if (request.method === "POST" && parts[1] === "pages" && parts.length === 2) {
    const auth = assertToken(request, env);

    if (auth) {
      return auth;
    }

    return json(await savePage(env, (await request.json()) as WikiPageInput), { status: 201 });
  }

  if (parts[1] === "pages" && parts[2]) {
    const slug = parts[2];

    if (request.method === "GET" && parts.length === 3) {
      const page = await getPage(env, slug);

      return page ? json(page) : notFound("Page not found");
    }

    if (request.method === "PUT" && parts.length === 3) {
      const auth = assertToken(request, env);

      if (auth) {
        return auth;
      }

      return json(await savePage(env, (await request.json()) as WikiPageInput, slug));
    }

    if (request.method === "DELETE" && parts.length === 3) {
      const auth = assertToken(request, env);

      return auth ?? deletePage(env, slug);
    }

    if (request.method === "GET" && parts[3] === "revisions") {
      return json(await listRevisions(env, slug));
    }

    if (request.method === "GET" && parts[3] === "backlinks") {
      const pages = await listPages(env);

      return json(pages.filter((page) => page.links.includes(slug)));
    }
  }

  if (request.method === "GET" && parts[1] === "categories") {
    const pages = await listPages(env);
    const summaries = new Map<string, number>();

    for (const page of pages) {
      for (const category of page.categories) {
        summaries.set(category, (summaries.get(category) ?? 0) + 1);
      }
    }

    const categories: WikiCategorySummary[] = Array.from(summaries, ([name, count]) => ({
      name,
      count,
    })).sort((left, right) => left.name.localeCompare(right.name));

    if (parts[2]) {
      return json(pages.filter((page) => page.categories.includes(parts[2])));
    }

    return json(categories);
  }

  if (request.method === "GET" && parts[1] === "search") {
    const query = url.searchParams.get("q")?.trim() ?? "";
    const pages = await listPages(env);

    if (!query) {
      return json([]);
    }

    return json(
      pages
        .filter((page) => {
          const haystack = `${page.title} ${page.content} ${page.categories.join(" ")}`.toLowerCase();

          return haystack.includes(query.toLowerCase());
        })
        .map((page) => summarizeSearch(page, query)),
    );
  }

  if (request.method === "GET" && parts[1] === "recent") {
    const pages = await listPages(env);
    const revisions = await Promise.all(pages.map((page) => listRevisions(env, page.slug)));

    return json(revisions.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 100));
  }

  return notFound("API route not found");
}

export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
