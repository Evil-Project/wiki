import {
  BookOpenText,
  Braces,
  Clock3,
  Dice5,
  Files,
  FolderTree,
  Home,
  Moon,
  Plus,
  Search,
  Shield,
  Sun,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { getEditToken, getWikiClient, setEditToken, type WikiClient } from "./data/wiki-client";

const HomePage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.HomePage })));
const PageView = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.PageView })));
const EditorPage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.EditorPage })));
const HistoryPage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.HistoryPage })));
const CategoriesPage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.CategoriesPage })));
const SearchPage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.SearchPage })));
const RecentPage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.RecentPage })));
const BacklinksPage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.BacklinksPage })));
const FilesPage = lazy(() => import("./routes/WikiPages").then((module) => ({ default: module.FilesPage })));

function ThemeButton() {
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
  );
}

function SearchJump() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  return (
    <form
      className="rail-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }}
    >
      <Search size={16} />
      <input
        aria-label="Search encyclopedia"
        placeholder="Search wiki"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}

function Sidebar({ client }: { client: WikiClient | null }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => getEditToken());

  async function openRandomPage() {
    const activeClient = client ?? (await getWikiClient());
    const pages = await activeClient.listPages();
    const page = pages[Math.floor(Math.random() * pages.length)];

    if (page) {
      navigate(`/wiki/${page.slug}`);
    }
  }

  return (
    <aside className="side-rail" aria-label="Wiki navigation">
      <header className="rail-header">
        <NavLink className="brand-lockup" to="/" aria-label="Wiki home">
          <span className="brand-mark">
            <Braces size={19} strokeWidth={2.1} />
          </span>
          <span>
            <strong>Neuro&apos;s Brain Dump</strong>
            <small>{client?.mode === "api" ? "Workers API" : "IndexedDB"}</small>
          </span>
        </NavLink>

        <div className="rail-actions">
          <ThemeButton />
          <button
            className="theme-toggle"
            type="button"
            aria-label="Open random page"
            title="Random page"
            onClick={openRandomPage}
          >
            <Dice5 size={18} />
          </button>
        </div>
      </header>

      <SearchJump />

      <nav className="section-nav">
        <NavLink to="/">
          <Home size={18} />
          <span>Main page</span>
        </NavLink>
        <NavLink to="/create">
          <Plus size={18} />
          <span>Create page</span>
        </NavLink>
        <NavLink to="/recent">
          <Clock3 size={18} />
          <span>Recent changes</span>
        </NavLink>
        <NavLink to="/categories">
          <FolderTree size={18} />
          <span>Categories</span>
        </NavLink>
        <NavLink to="/files">
          <Files size={18} />
          <span>Uploaded files</span>
        </NavLink>
      </nav>

      <label className="token-box">
        <span>
          <Shield size={15} />
          Edit token
        </span>
        <input
          type="password"
          value={token}
          placeholder="change-me-local-token"
          onChange={(event) => {
            setToken(event.target.value);
            setEditToken(event.target.value);
          }}
        />
      </label>

      <footer className="rail-footer">
        <span className="footer-sticker">Made with heart</span>
        <span className="footer-sticker footer-sticker-pink">99% AI, 1% Something More</span>
      </footer>
    </aside>
  );
}

function AppRoutes() {
  const [client, setClient] = useState<WikiClient | null>(null);

  useEffect(() => {
    getWikiClient().then(setClient);
  }, []);

  return (
    <main className="wiki-shell">
      <div className="bg-effects" aria-hidden="true">
        <span className="bubble bubble-one"></span>
        <span className="bubble bubble-two"></span>
        <span className="bubble bubble-three"></span>
        <span className="bubble bubble-four"></span>
        <span className="bubble bubble-five"></span>
        <span className="bubble bubble-six"></span>
        <span className="particle particle-one"></span>
        <span className="particle particle-two"></span>
        <span className="particle particle-three"></span>
      </div>

      <Sidebar client={client} />

      <section className="page-column">
        <Suspense
          fallback={
            <section className="wiki-section">
              <div className="section-heading">
                <span className="section-icon">
                  <BookOpenText size={22} />
                </span>
                <div>
                  <p>Loading</p>
                  <h2>Opening encyclopedia</h2>
                </div>
              </div>
            </section>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<EditorPage />} />
            <Route path="/wiki/:slug" element={<PageView />} />
            <Route path="/wiki/:slug/edit" element={<EditorPage />} />
            <Route path="/wiki/:slug/history" element={<HistoryPage />} />
            <Route path="/wiki/:slug/backlinks" element={<BacklinksPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/:category" element={<CategoriesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/recent" element={<RecentPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="*" element={<PageView fallbackSlug="Main_Page" />} />
          </Routes>
        </Suspense>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
