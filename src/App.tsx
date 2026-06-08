import {
  Archive,
  BookOpenText,
  Braces,
  Cloud,
  Compass,
  GitBranch,
  Hash,
  Layers3,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "principles", label: "Principles", icon: ShieldCheck },
  { id: "structure", label: "Structure", icon: Layers3 },
  { id: "deployment", label: "Deployment", icon: Cloud },
  { id: "references", label: "References", icon: Archive },
];

const pageSections = [
  {
    id: "overview",
    eyebrow: "Entry 001",
    title: "Workspace Wiki",
    icon: BookOpenText,
    body:
      "A compact knowledge page for keeping project context, conventions, deployment notes, and operational details in one readable surface.",
    notes: ["Owner: XiaoYuan", "Status: Draft", "Stack: Vite, React, Workers"],
  },
  {
    id: "principles",
    eyebrow: "Editorial Rules",
    title: "Principles",
    icon: ShieldCheck,
    body:
      "Write entries as durable operating notes: direct names, concrete dates, command snippets that have been verified, and links that point to primary sources.",
    notes: ["Prefer short sections", "Keep assumptions visible", "Date unstable facts"],
  },
  {
    id: "structure",
    eyebrow: "Information Shape",
    title: "Structure",
    icon: Layers3,
    body:
      "Each article should carry a title, purpose, current state, procedure, and references. That pattern makes later migration to file-backed wiki content straightforward.",
    notes: ["Article", "Procedure", "Glossary", "Change record"],
  },
  {
    id: "deployment",
    eyebrow: "Runtime",
    title: "Cloudflare Workers",
    icon: Cloud,
    body:
      "The page builds into static assets under dist. Wrangler deploys those assets through Workers, with SPA fallback enabled for client-side routes.",
    notes: ["Build output: dist", "Config: wrangler.jsonc", "Command: npm run deploy"],
  },
  {
    id: "references",
    eyebrow: "Trail",
    title: "References",
    icon: Archive,
    body:
      "Source material belongs close to the claim it supports. Use references for specifications, account-level deployment settings, and project decisions that may need review later.",
    notes: ["Primary docs", "Repo links", "Decision notes"],
  },
];

const glossary = [
  ["Worker", "Cloudflare edge runtime that serves this wiki after deployment."],
  ["Static Assets", "Built files uploaded by Wrangler and routed by the Worker."],
  ["Wrangler", "Cloudflare CLI used for local Worker workflows and deploys."],
];

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem("wiki-theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("wiki-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <main className="wiki-shell">
      <div className="bg-effects" aria-hidden="true">
        <span className="bubble bubble-one"></span>
        <span className="bubble bubble-two"></span>
        <span className="bubble bubble-three"></span>
        <span className="particle particle-one"></span>
        <span className="particle particle-two"></span>
      </div>

      <aside className="side-rail" aria-label="Wiki navigation">
        <a className="brand-lockup" href="#overview" aria-label="Wiki home">
          <span className="brand-mark">
            <Braces size={19} strokeWidth={2.1} />
          </span>
          <span>
            <strong>Neuro Wiki</strong>
            <small>Brain dump</small>
          </span>
        </a>

        <button
          className="theme-toggle"
          type="button"
          aria-label="Toggle color theme"
          aria-pressed={isDark}
          title="Toggle color theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <nav className="section-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <a href={`#${item.id}`} key={item.id}>
                <Icon size={18} strokeWidth={1.9} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      <section className="page-column">
        <header className="wiki-hero" id="overview">
          <img
            src="/neuro-wiki-hero.png"
            alt="Pastel wiki knowledge portal with floating bubbles and archive cards"
          />
          <div className="hero-copy">
            <p className="kicker">Personal Knowledge Base</p>
            <h1>Neuro Wiki</h1>
            <p>
              A bright encyclopedia shell for field notes, transmissions,
              categories, and future article history.
            </p>
          </div>
          <div className="hero-meta" aria-label="Wiki metadata">
            <span>
              <GitBranch size={16} />
              main
            </span>
            <span>
              <Hash size={16} />
              v0.1
            </span>
          </div>
        </header>

        <div className="top-strip">
          <label className="search-box">
            <Search size={17} />
            <input type="search" placeholder="Search index" aria-label="Search index" />
          </label>
          <div className="freshness">
            <Sparkles size={17} />
            Updated Jun 7, 2026
          </div>
        </div>

        <div className="content-grid">
          <article className="article-stack" aria-label="Wiki article">
            {pageSections.map((section) => {
              const Icon = section.icon;

              return (
                <section className="wiki-section" id={section.id} key={section.id}>
                  <div className="section-heading">
                    <span className="section-icon">
                      <Icon size={22} />
                    </span>
                    <div>
                      <p>{section.eyebrow}</p>
                      <h2>{section.title}</h2>
                    </div>
                  </div>
                  <p className="section-body">{section.body}</p>
                  <ul className="note-list">
                    {section.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </article>

          <aside className="context-panel" aria-label="Wiki context">
            <section>
              <h2>Index</h2>
              <ol>
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h2>Glossary</h2>
              <dl>
                {glossary.map(([term, definition]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
