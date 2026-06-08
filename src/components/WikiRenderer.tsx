import DOMPurify from "dompurify";
import { slugifyTitle } from "../shared/wiki-utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkWikiText(html: string): string {
  return html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, rawTitle: string, rawLabel?: string) => {
    const title = rawTitle.trim();
    const label = rawLabel?.trim() || title;

    return `<a class="internal-link" href="/wiki/${slugifyTitle(title)}">${escapeHtml(label)}</a>`;
  });
}

interface WikiRendererProps {
  html: string;
}

function WikiRenderer({ html }: WikiRendererProps) {
  const sanitized = DOMPurify.sanitize(linkWikiText(html), {
    ADD_ATTR: ["target"],
  });

  return <div className="wiki-renderer" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

export default WikiRenderer;
