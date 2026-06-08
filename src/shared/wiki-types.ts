export interface WikiPage {
  slug: string;
  title: string;
  content: string;
  categories: string[];
  tags: string[];
  links: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  revisionId: string;
}

export interface WikiRevision {
  id: string;
  pageSlug: string;
  title: string;
  content: string;
  categories: string[];
  tags: string[];
  links: string[];
  createdAt: string;
  author: string;
  note: string;
}

export interface WikiFile {
  id: string;
  name: string;
  type: string;
  size: number;
  alt: string;
  createdAt: string;
  url?: string;
  dataUrl?: string;
}

export interface WikiSearchResult {
  slug: string;
  title: string;
  snippet: string;
  updatedAt: string;
  categories: string[];
}

export interface WikiPageInput {
  title: string;
  content: string;
  categories: string[];
  tags: string[];
  author?: string;
  note?: string;
}

export interface WikiFileInput {
  name: string;
  type: string;
  size: number;
  alt: string;
  dataUrl: string;
}

export interface WikiCategorySummary {
  name: string;
  count: number;
}
