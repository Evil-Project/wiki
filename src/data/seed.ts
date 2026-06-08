import { createPageSnapshot, slugifyTitle } from "../shared/wiki-utils";
import type { WikiPage, WikiRevision } from "../shared/wiki-types";

export const wikiSeedVersion = 3;

const seedInputs = [
  {
    title: "Main Page",
    content:
      "<h2>Welcome to Neuro's Brain Dump</h2><p>This is a local-first encyclopedia inspired by MediaWiki workflows and the blog.neurosama.com transmission style.</p><p>Start with [[Article Editing]], browse [[Category:Infrastructure]], or inspect [[Revision History]].</p>",
    categories: ["Brain Dump", "Guides", "Infrastructure"],
    tags: ["welcome", "wiki", "neuro-sama"],
  },
  {
    title: "Article Editing",
    content:
      "<h2>Editing transmissions</h2><p>Every page can be edited through the TipTap editor. Saves create full snapshot revisions, so history remains inspectable.</p><p>Use internal links like [[Main Page]] or [[Uploaded Files]] inside article text.</p>",
    categories: ["Brain Dump", "Guides"],
    tags: ["editor", "tiptap"],
  },
  {
    title: "Revision History",
    content:
      "<h2>Revision model</h2><p>Revisions store complete page snapshots with title, content, categories, tags, author, note, and timestamp.</p><p>The history route renders a lightweight line diff between adjacent snapshots.</p>",
    categories: ["Infrastructure"],
    tags: ["history", "audit"],
  },
  {
    title: "Uploaded Files",
    content:
      "<h2>File archive</h2><p>The files manager stores uploads in R2 on Workers when configured, and keeps data URLs in IndexedDB during local development.</p><p>Uploaded images can be referenced from article content after upload.</p>",
    categories: ["Brain Dump", "Infrastructure", "Media"],
    tags: ["files", "r2"],
  },
];

export function createSeedData(): { pages: WikiPage[]; revisions: WikiRevision[] } {
  const pages: WikiPage[] = [];
  const revisions: WikiRevision[] = [];

  for (const input of seedInputs) {
    const slug = slugifyTitle(input.title);
    const snapshot = createPageSnapshot({
      slug,
      title: input.title,
      content: input.content,
      categories: input.categories,
      tags: input.tags,
      author: "System",
      note: "Seed article",
    });

    pages.push(snapshot.page);
    revisions.push(snapshot.revision);
  }

  return { pages, revisions };
}
