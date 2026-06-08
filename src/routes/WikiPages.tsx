import {
  Archive,
  ArrowLeftRight,
  Clock3,
  Edit3,
  FileImage,
  FolderTree,
  GitBranch,
  Hash,
  Link2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import WikiEditor from "../components/WikiEditor";
import WikiRenderer from "../components/WikiRenderer";
import VirtualList from "../components/VirtualList";
import { getWikiClient } from "../data/wiki-client";
import { titleFromSlug } from "../shared/wiki-utils";
import type {
  WikiCategorySummary,
  WikiFile,
  WikiPage,
  WikiRevision,
  WikiSearchResult,
} from "../shared/wiki-types";

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? <mark key={index}>{part}</mark> : part,
      )}
    </>
  );
}

function PageCard({ page }: { page: WikiPage }) {
  return (
    <Link className="result-card" to={`/wiki/${page.slug}`}>
      <strong>{page.title}</strong>
      <span>{page.categories.join(", ") || "Uncategorized"}</span>
    </Link>
  );
}

function RevisionLine({ revision }: { revision: WikiRevision }) {
  return (
    <Link className="result-card" to={`/wiki/${revision.pageSlug}/history`}>
      <strong>{revision.title}</strong>
      <span>
        {formatDate(revision.createdAt)} by {revision.author} - {revision.note}
      </span>
    </Link>
  );
}

function HeroCard({ pages, revisions, loading }: { pages: WikiPage[]; revisions: WikiRevision[]; loading: boolean }) {
  return (
    <header className="wiki-hero">
      <img
        src="/neuro-wiki-hero.png"
        alt="Pastel wiki knowledge portal with floating bubbles and archive cards"
      />
      <div className="hero-copy">
        <p className="kicker">Status: suspiciously organized</p>
        <h1>Neuro&apos;s Brain Dump</h1>
        <p>
          An editable archive for stray thoughts, transmissions, revision trails,
          categories, search, backlinks, and files that probably should have been labeled.
        </p>
      </div>
      <div className="hero-meta" aria-label="Wiki metadata">
        <span>
          <GitBranch size={16} />
          {loading ? "loading pages" : `${pages.length} pages`}
        </span>
        <span>
          <Hash size={16} />
          {loading ? "loading revisions" : `${revisions.length} revisions`}
        </span>
      </div>
    </header>
  );
}

export function HomePage() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [revisions, setRevisions] = useState<WikiRevision[]>([]);
  const [categories, setCategories] = useState<WikiCategorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWikiClient().then(async (client) => {
      setPages(await client.listPages());
      setRevisions(await client.recentChanges());
      setCategories(await client.listCategories());
      setLoading(false);
    });
  }, []);

  return (
    <>
      <HeroCard pages={pages} revisions={revisions} loading={loading} />
      <div className="top-strip">
        <Link className="command-pill" to="/create">
          <Plus size={17} />
          Create article
        </Link>
        <Link className="command-pill" to="/recent">
          <Clock3 size={17} />
          Recent changes
        </Link>
      </div>
      <div className="content-grid">
        <article className="article-stack" aria-label="Wiki overview">
          <section className="wiki-section">
            <div className="section-heading">
              <span className="section-icon">
                <Archive size={22} />
              </span>
              <div>
                <p>Archive</p>
                <h2>All pages</h2>
              </div>
            </div>
            {loading ? (
              <p className="section-body">Loading page index...</p>
            ) : (
              <VirtualList items={pages} itemHeight={78} renderItem={(page) => <PageCard page={page} />} />
            )}
          </section>
          <section className="wiki-section">
            <div className="section-heading">
              <span className="section-icon">
                <Clock3 size={22} />
              </span>
              <div>
                <p>Feed</p>
                <h2>Latest transmissions</h2>
              </div>
            </div>
            {loading ? (
              <p className="section-body">Loading recent changes...</p>
            ) : (
              <VirtualList
                items={revisions}
                itemHeight={82}
                renderItem={(revision) => <RevisionLine revision={revision} />}
              />
            )}
          </section>
        </article>
        <aside className="context-panel" aria-label="Wiki categories">
          <section>
            <h2>Categories</h2>
            <ol>
              {categories.map((category) => (
                <li key={category.name}>
                  <Link to={`/categories/${encodeURIComponent(category.name)}`}>
                    {category.name} ({category.count})
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}

export function PageView({ fallbackSlug }: { fallbackSlug?: string }) {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.slug ?? fallbackSlug ?? "Main_Page";
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWikiClient()
      .then((client) => client.getPage(slug))
      .then(setPage)
      .finally(() => setLoading(false));
  }, [slug]);

  async function deletePage() {
    if (!page || !window.confirm(`Delete ${page.title}?`)) {
      return;
    }

    const client = await getWikiClient();
    await client.deletePage(page.slug);
    navigate("/");
  }

  if (loading) {
    return <section className="wiki-section">Loading page</section>;
  }

  if (!page) {
    return (
      <section className="wiki-section">
        <div className="section-heading">
          <span className="section-icon">
            <Plus size={22} />
          </span>
          <div>
            <p>Missing page</p>
            <h2>{titleFromSlug(slug)}</h2>
          </div>
        </div>
        <p className="section-body">This page does not exist yet.</p>
        <Link className="command-pill" to={`/wiki/${slug}/edit`}>
          Create this page
        </Link>
      </section>
    );
  }

  return (
    <article className="wiki-section article-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Article</p>
          <h1>{page.title}</h1>
        </div>
        <div className="page-actions">
          <Link className="command-pill" to={`/wiki/${page.slug}/edit`}>
            <Edit3 size={16} />
            Edit
          </Link>
          <Link className="command-pill" to={`/wiki/${page.slug}/history`}>
            <Clock3 size={16} />
            History
          </Link>
          <Link className="command-pill" to={`/wiki/${page.slug}/backlinks`}>
            <Link2 size={16} />
            What links here
          </Link>
          <button
            className="danger-pill"
            type="button"
            aria-label={`Delete ${page.title}`}
            onClick={deletePage}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
      <WikiRenderer html={page.content} />
      <ul className="note-list">
        {page.categories.map((category) => (
          <li key={category}>
            <Link to={`/categories/${encodeURIComponent(category)}`}>{category}</Link>
          </li>
        ))}
      </ul>
      <p className="meta-line">Last edited {formatDate(page.updatedAt)}</p>
    </article>
  );
}

export function EditorPage() {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.slug;
  const [title, setTitle] = useState(slug ? titleFromSlug(slug) : "");
  const [content, setContent] = useState("<h2>New article</h2><p>Start writing here.</p>");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("Editor");
  const [note, setNote] = useState("Updated article");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      return;
    }

    getWikiClient().then(async (client) => {
      const page = await client.getPage(slug);

      if (page) {
        setTitle(page.title);
        setContent(page.content);
        setCategories(page.categories.join(", "));
        setTags(page.tags.join(", "));
      }
    });
  }, [slug]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const client = await getWikiClient();
      const page = await client.savePage(
        {
          title,
          content,
          categories: splitList(categories),
          tags: splitList(tags),
          author,
          note,
        },
        slug,
      );

      navigate(`/wiki/${page.slug}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  return (
    <form className="wiki-section editor-form" onSubmit={save}>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">{slug ? "Edit" : "Create"}</p>
          <h1>{slug ? title : "New page"}</h1>
        </div>
        <button className="command-pill" type="submit">
          <Save size={16} />
          Save revision
        </button>
      </div>
      {error && <p className="error-banner">{error}</p>}
      <label>
        Title
        <input value={title} required onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Categories
        <input
          value={categories}
          placeholder="Guides, Infrastructure"
          onChange={(event) => setCategories(event.target.value)}
        />
      </label>
      <label>
        Tags
        <input
          value={tags}
          placeholder="search, editor"
          onChange={(event) => setTags(event.target.value)}
        />
      </label>
      <div className="form-grid">
        <label>
          Author
          <input value={author} onChange={(event) => setAuthor(event.target.value)} />
        </label>
        <label>
          Revision note
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      <WikiEditor value={content} onChange={setContent} />
    </form>
  );
}

function makeDiff(current: string, previous = "") {
  const left = previous.replace(/<[^>]+>/g, "\n").split(/\n+/).filter(Boolean);
  const right = current.replace(/<[^>]+>/g, "\n").split(/\n+/).filter(Boolean);
  const lines = new Set([...left, ...right]);

  return Array.from(lines).map((line) => ({
    line,
    added: right.includes(line) && !left.includes(line),
    removed: left.includes(line) && !right.includes(line),
  }));
}

export function HistoryPage() {
  const { slug = "Main_Page" } = useParams();
  const [revisions, setRevisions] = useState<WikiRevision[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    getWikiClient().then((client) => client.listRevisions(slug).then(setRevisions));
  }, [slug]);

  const current = revisions[selected];
  const previous = revisions[selected + 1];
  const diff = useMemo(() => makeDiff(current?.content ?? "", previous?.content), [current, previous]);

  return (
    <div className="content-grid">
      <section className="wiki-section">
        <div className="section-heading">
          <span className="section-icon">
            <ArrowLeftRight size={22} />
          </span>
          <div>
            <p>History</p>
            <h2>{titleFromSlug(slug)}</h2>
          </div>
        </div>
        <div className="diff-view">
          {diff.map((entry, index) => (
            <p
              className={entry.added ? "diff-added" : entry.removed ? "diff-removed" : ""}
              key={`${entry.line}-${index}`}
            >
              {entry.added ? "+ " : entry.removed ? "- " : "  "}
              {entry.line}
            </p>
          ))}
        </div>
      </section>
      <aside className="context-panel">
        <section>
          <h2>Revisions</h2>
          <VirtualList
            items={revisions}
            itemHeight={92}
            renderItem={(revision, index) => (
              <button
                className="revision-button"
                type="button"
                aria-label={`Show revision from ${formatDate(revision.createdAt)}`}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                <strong>{formatDate(revision.createdAt)}</strong>
                <span>{revision.author} - {revision.note}</span>
              </button>
            )}
          />
        </section>
      </aside>
    </div>
  );
}

export function CategoriesPage() {
  const { category } = useParams();
  const [categories, setCategories] = useState<WikiCategorySummary[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);

  useEffect(() => {
    getWikiClient().then(async (client) => {
      setCategories(await client.listCategories());
      setPages(category ? await client.listCategoryPages(category) : []);
    });
  }, [category]);

  return (
    <section className="wiki-section">
      <div className="section-heading">
        <span className="section-icon">
          <FolderTree size={22} />
        </span>
        <div>
          <p>Browse</p>
          <h1>{category ?? "Categories"}</h1>
        </div>
      </div>
      {category ? (
        <VirtualList items={pages} itemHeight={78} renderItem={(page) => <PageCard page={page} />} />
      ) : (
        <div className="category-grid">
          {categories.map((item) => (
            <Link className="result-card" to={`/categories/${encodeURIComponent(item.name)}`} key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.count} pages</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(query);
  const [results, setResults] = useState<WikiSearchResult[]>([]);

  useEffect(() => {
    getWikiClient().then((client) => client.search(query).then(setResults));
  }, [query]);

  return (
    <section className="wiki-section">
      <div className="section-heading">
        <span className="section-icon">
          <Search size={22} />
        </span>
        <div>
          <p>Full-text</p>
          <h1>Search</h1>
        </div>
      </div>
      <form
        className="search-page-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchParams({ q: draft });
        }}
      >
        <input
          aria-label="Search pages"
          value={draft}
          placeholder="Find pages, categories, or content"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="command-pill" type="submit">Search</button>
      </form>
      <VirtualList
        items={results}
        itemHeight={104}
        renderItem={(result) => (
          <Link className="result-card" to={`/wiki/${result.slug}`}>
            <strong>
              <Highlight text={result.title} query={query} />
            </strong>
            <span>
              <Highlight text={result.snippet} query={query} />
            </span>
          </Link>
        )}
      />
    </section>
  );
}

export function RecentPage() {
  const [revisions, setRevisions] = useState<WikiRevision[]>([]);

  useEffect(() => {
    getWikiClient().then((client) => client.recentChanges().then(setRevisions));
  }, []);

  return (
    <section className="wiki-section">
      <div className="section-heading">
        <span className="section-icon">
          <Clock3 size={22} />
        </span>
        <div>
          <p>Audit</p>
          <h1>Recent changes</h1>
        </div>
      </div>
      <VirtualList
        items={revisions}
        itemHeight={86}
        renderItem={(revision) => <RevisionLine revision={revision} />}
      />
    </section>
  );
}

export function BacklinksPage() {
  const { slug = "Main_Page" } = useParams();
  const [pages, setPages] = useState<WikiPage[]>([]);

  useEffect(() => {
    getWikiClient().then((client) => client.backlinks(slug).then(setPages));
  }, [slug]);

  return (
    <section className="wiki-section">
      <div className="section-heading">
        <span className="section-icon">
          <Link2 size={22} />
        </span>
        <div>
          <p>Backlinks</p>
          <h1>What links to {titleFromSlug(slug)}</h1>
        </div>
      </div>
      <VirtualList items={pages} itemHeight={78} renderItem={(page) => <PageCard page={page} />} />
    </section>
  );
}

export function FilesPage() {
  const [files, setFiles] = useState<WikiFile[]>([]);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState("");

  async function loadFiles() {
    const client = await getWikiClient();
    setFiles(await client.listFiles());
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const client = await getWikiClient();
        await client.saveFile({
          name: file.name,
          type: file.type,
          size: file.size,
          alt,
          dataUrl: String(reader.result),
        });
        setAlt("");
        input.value = "";
        await loadFiles();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Upload failed");
      }
    };
    reader.readAsDataURL(file);
  }

  async function deleteFile(id: string) {
    const client = await getWikiClient();
    await client.deleteFile(id);
    await loadFiles();
  }

  return (
    <section className="wiki-section">
      <div className="section-heading">
        <span className="section-icon">
          <FileImage size={22} />
        </span>
        <div>
          <p>Media</p>
          <h1>Uploaded files</h1>
        </div>
      </div>
      {error && <p className="error-banner">{error}</p>}
      <form className="file-form" onSubmit={upload}>
        <input name="file" type="file" accept="image/*" aria-label="Image file" />
        <input
          value={alt}
          aria-label="File alt text"
          placeholder="Alt text"
          onChange={(event) => setAlt(event.target.value)}
        />
        <button className="command-pill" type="submit">
          <Upload size={16} />
          Upload
        </button>
      </form>
      <VirtualList
        items={files}
        itemHeight={124}
        renderItem={(file) => (
          <article className="file-card">
            {file.url && <img src={file.url} alt={file.alt || file.name} />}
            <div>
              <strong>{file.name}</strong>
              <span>{Math.round(file.size / 1024)} KB - {file.type}</span>
              <code>{file.url}</code>
            </div>
            <button
              className="danger-pill"
              type="button"
              aria-label={`Delete ${file.name}`}
              onClick={() => deleteFile(file.id)}
            >
              <Trash2 size={15} />
            </button>
          </article>
        )}
      />
    </section>
  );
}
