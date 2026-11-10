import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { isListedPath } from "@/lib/articles";

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
};

export const headingId = (label: string) =>
  label.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Headings in the markdown, in order, for the table of contents. */
export function markdownHeadings(body: string): { id: string; label: string }[] {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const label = m[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").trim();
    return { id: headingId(label), label };
  });
}

const components: Components = {
  h2: ({ children }) => {
    const label = textOf(children);
    return <h2 id={headingId(label)} className="mt-2 scroll-mt-4 text-lg font-semibold leading-snug text-ink md:text-xl">{children}</h2>;
  },
  h3: ({ children }) => <h3 className="mt-2 text-[15px] font-semibold text-ink">{children}</h3>,
  p: ({ children }) => <p>{children}</p>,
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1.5 pl-5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ href, children }) => {
    const url = href ?? "";
    if (url.startsWith("/")) {
      if (!isListedPath(url)) return <span>{children}</span>;
      return <Link href={url} className="font-medium text-gold-text underline-offset-4 hover:underline">{children}</Link>;
    }
    return <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-gold-text underline-offset-4 hover:underline">{children}</a>;
  },
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[520px] text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border bg-muted text-xs text-ink-3">{children}</thead>,
  th: ({ children }) => <th scope="col" className="px-3 py-2.5 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b border-border px-3 py-2.5 align-top text-ink-2">{children}</td>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-gold-line pl-4 text-ink-2">{children}</blockquote>,
};

/** Markdown body of one guide. Links to articles that are not public yet render as text, so the URL is not advertised. */
export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-ink-2 md:text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>
    </div>
  );
}
