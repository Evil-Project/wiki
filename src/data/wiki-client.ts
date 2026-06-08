import { createSeedData, wikiSeedVersion } from "./seed";
import {
  canonicalPageSlug,
  createPageSnapshot,
  slugifyTitle,
  summarizeSearch,
} from "../shared/wiki-utils";
import type {
  WikiCategorySummary,
  WikiFile,
  WikiFileInput,
  WikiPage,
  WikiPageInput,
  WikiRevision,
  WikiSearchResult,
} from "../shared/wiki-types";

const dbName = "neuro-wiki";
const dbVersion = 1;
const editTokenKey = "wiki-edit-token";
const seedVersion = wikiSeedVersion;
const requiredSeedSlugs = ["Main_Page", "Article_Editing", "Revision_History", "Uploaded_Files"];

export interface WikiClient {
  readonly mode: "api" | "indexeddb";
  listPages(): Promise<WikiPage[]>;
  getPage(slug: string): Promise<WikiPage | null>;
  savePage(input: WikiPageInput, slug?: string): Promise<WikiPage>;
  deletePage(slug: string): Promise<void>;
  listRevisions(slug: string): Promise<WikiRevision[]>;
  listCategories(): Promise<WikiCategorySummary[]>;
  listCategoryPages(category: string): Promise<WikiPage[]>;
  search(query: string): Promise<WikiSearchResult[]>;
  recentChanges(): Promise<WikiRevision[]>;
  backlinks(slug: string): Promise<WikiPage[]>;
  listFiles(): Promise<WikiFile[]>;
  saveFile(input: WikiFileInput): Promise<WikiFile>;
  deleteFile(id: string): Promise<void>;
}

function requestHeaders(): HeadersInit {
  const token = window.localStorage.getItem(editTokenKey);

  return {
    "content-type": "application/json",
    ...(token ? { "x-wiki-token": token } : {}),
  };
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...requestHeaders(),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const apiClient: WikiClient = {
  mode: "api",
  listPages: () => apiRequest<WikiPage[]>("/api/pages"),
  getPage: async (slug) => {
    const response = await fetch(`/api/pages/${canonicalPageSlug(slug)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<WikiPage>;
  },
  savePage: (input, slug) =>
    apiRequest<WikiPage>(slug ? `/api/pages/${canonicalPageSlug(slug)}` : "/api/pages", {
      method: slug ? "PUT" : "POST",
      body: JSON.stringify(input),
    }),
  deletePage: async (slug) => {
    await apiRequest<{ ok: boolean }>(`/api/pages/${canonicalPageSlug(slug)}`, { method: "DELETE" });
  },
  listRevisions: (slug) => apiRequest<WikiRevision[]>(`/api/pages/${canonicalPageSlug(slug)}/revisions`),
  listCategories: () => apiRequest<WikiCategorySummary[]>("/api/categories"),
  listCategoryPages: (category) => apiRequest<WikiPage[]>(`/api/categories/${encodeURIComponent(category)}`),
  search: (query) => apiRequest<WikiSearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`),
  recentChanges: () => apiRequest<WikiRevision[]>("/api/recent"),
  backlinks: (slug) => apiRequest<WikiPage[]>(`/api/pages/${canonicalPageSlug(slug)}/backlinks`),
  listFiles: () => apiRequest<WikiFile[]>("/api/files"),
  saveFile: (input) =>
    apiRequest<WikiFile>("/api/files", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteFile: async (id) => {
    await apiRequest<{ ok: boolean }>(`/api/files/${id}`, { method: "DELETE" });
  },
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("pages")) {
        db.createObjectStore("pages", { keyPath: "slug" });
      }

      if (!db.objectStoreNames.contains("revisions")) {
        const revisions = db.createObjectStore("revisions", { keyPath: "id" });
        revisions.createIndex("pageSlug", "pageSlug", { unique: false });
      }

      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function putValue<T>(storeName: string, value: T): Promise<void> {
  await transaction(storeName, "readwrite", (store) => store.put(value));
}

async function getValue<T>(storeName: string, key: string): Promise<T | null> {
  const value = await transaction<T | undefined>(storeName, "readonly", (store) => store.get(key));

  return value ?? null;
}

async function deleteValue(storeName: string, key: string): Promise<void> {
  await transaction(storeName, "readwrite", (store) => store.delete(key));
}

async function getAllValues<T>(storeName: string): Promise<T[]> {
  return transaction<T[]>(storeName, "readonly", (store) => store.getAll());
}

const localState = {
  pages: new Map<string, WikiPage>(),
  revisions: new Map<string, WikiRevision>(),
  files: new Map<string, WikiFile>(),
  ready: false,
};

function withTimeout<T>(promise: Promise<T>, label: string, ms = 900): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function seedLocalState(): void {
  const { pages, revisions } = createSeedData();

  localState.pages = new Map(pages.map((page) => [page.slug, page]));
  localState.revisions = new Map(revisions.map((revision) => [revision.id, revision]));
  localState.files = new Map();
}

function persistValue<T>(storeName: string, value: T): void {
  putValue(storeName, value).catch(() => {
    // IndexedDB is a best-effort local persistence layer; the in-memory mirror stays authoritative.
  });
}

function persistDelete(storeName: string, key: string): void {
  deleteValue(storeName, key).catch(() => {
    // IndexedDB is a best-effort local persistence layer; the in-memory mirror stays authoritative.
  });
}

async function hydrateLocalState(): Promise<void> {
  if (localState.ready) {
    return;
  }

  try {
    const [pages, revisions, files, seedMeta] = await withTimeout(
      Promise.all([
        getAllValues<WikiPage>("pages"),
        getAllValues<WikiRevision>("revisions"),
        getAllValues<WikiFile>("files"),
        getValue<{ key: string; value: number }>("meta", "seed-version"),
      ]),
      "IndexedDB hydration",
    );
    const hasExpectedSeeds = requiredSeedSlugs.every((slug) =>
      pages.some((page) => page.slug === slug && !page.deletedAt),
    );

    if (seedMeta?.value === seedVersion && hasExpectedSeeds) {
      localState.pages = new Map(pages.map((page) => [page.slug, page]));
      localState.revisions = new Map(revisions.map((revision) => [revision.id, revision]));
      localState.files = new Map(files.map((file) => [file.id, file]));
      localState.ready = true;

      return;
    }
  } catch {
    // Fall back to seeded memory if IndexedDB is unavailable, blocked, or stale.
  }

  seedLocalState();
  localState.ready = true;

  for (const page of localState.pages.values()) {
    persistValue("pages", page);
  }

  for (const revision of localState.revisions.values()) {
    persistValue("revisions", revision);
  }

  persistValue("meta", { key: "seeded", value: true });
  persistValue("meta", { key: "seed-version", value: seedVersion });
}

async function localPages(): Promise<WikiPage[]> {
  await hydrateLocalState();

  return Array.from(localState.pages.values())
    .filter((page) => !page.deletedAt)
    .sort((left, right) => left.title.localeCompare(right.title));
}

const localClient: WikiClient = {
  mode: "indexeddb",
  listPages: localPages,
  getPage: async (slug) => {
    await hydrateLocalState();

    const page = localState.pages.get(canonicalPageSlug(slug));

    return page && !page.deletedAt ? page : null;
  },
  savePage: async (input, slug = slugifyTitle(input.title)) => {
    await hydrateLocalState();

    const pageSlug = canonicalPageSlug(slug);
    const previous = localState.pages.get(pageSlug);
    const snapshot = createPageSnapshot({
      slug: pageSlug,
      title: input.title,
      content: input.content,
      categories: input.categories,
      tags: input.tags,
      author: input.author,
      note: input.note,
      previous: previous ?? undefined,
    });

    localState.pages.set(snapshot.page.slug, snapshot.page);
    localState.revisions.set(snapshot.revision.id, snapshot.revision);
    persistValue("pages", snapshot.page);
    persistValue("revisions", snapshot.revision);

    return snapshot.page;
  },
  deletePage: async (slug) => {
    const pageSlug = canonicalPageSlug(slug);
    const page = await localClient.getPage(pageSlug);

    if (page) {
      const deletedPage = { ...page, deletedAt: new Date().toISOString() };
      localState.pages.set(pageSlug, deletedPage);
      persistValue("pages", deletedPage);
    }
  },
  listRevisions: async (slug) => {
    await hydrateLocalState();

    const pageSlug = canonicalPageSlug(slug);

    return Array.from(localState.revisions.values())
      .filter((revision) => revision.pageSlug === pageSlug)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  },
  listCategories: async () => {
    const pages = await localPages();
    const categories = new Map<string, number>();

    for (const page of pages) {
      for (const category of page.categories) {
        categories.set(category, (categories.get(category) ?? 0) + 1);
      }
    }

    return Array.from(categories, ([name, count]) => ({ name, count })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  },
  listCategoryPages: async (category) => {
    const pages = await localPages();

    return pages.filter((page) => page.categories.includes(category));
  },
  search: async (query) => {
    const pages = await localPages();
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    return pages
      .filter((page) => `${page.title} ${page.content} ${page.categories.join(" ")}`.toLowerCase().includes(normalized))
      .map((page) => summarizeSearch(page, query));
  },
  recentChanges: async () => {
    await hydrateLocalState();

    return Array.from(localState.revisions.values())
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 100);
  },
  backlinks: async (slug) => {
    const pages = await localPages();
    const pageSlug = canonicalPageSlug(slug);

    return pages.filter((page) => page.links.includes(pageSlug));
  },
  listFiles: async () => {
    await hydrateLocalState();

    return Array.from(localState.files.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  },
  saveFile: async (input) => {
    await hydrateLocalState();

    const file: WikiFile = {
      id: crypto.randomUUID(),
      name: input.name,
      type: input.type,
      size: input.size,
      alt: input.alt,
      dataUrl: input.dataUrl,
      url: input.dataUrl,
      createdAt: new Date().toISOString(),
    };

    localState.files.set(file.id, file);
    persistValue("files", file);

    return file;
  },
  deleteFile: async (id) => {
    await hydrateLocalState();
    localState.files.delete(id);
    persistDelete("files", id);
  },
};

let clientPromise: Promise<WikiClient> | null = null;

export function getEditToken(): string {
  return window.localStorage.getItem(editTokenKey) ?? "";
}

export function setEditToken(token: string): void {
  if (token.trim()) {
    window.localStorage.setItem(editTokenKey, token.trim());
  } else {
    window.localStorage.removeItem(editTokenKey);
  }
}

export function getWikiClient(): Promise<WikiClient> {
  clientPromise ??= fetch("/api/health")
    .then(async (response) => {
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok || !contentType.includes("application/json")) {
        return localClient;
      }

      const health = (await response.json()) as { ok?: boolean };

      return health.ok ? apiClient : localClient;
    })
    .catch(() => localClient);

  return clientPromise;
}
