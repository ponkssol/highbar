/** File-based guides. Drop a Markdown file in content/articles. Visibility is decided on each read from publish_at. */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { isPublished, publishTimeMs, type PublishFields } from "./publish";

export interface ArticleFaq { question: string; answer: string }

export interface Article extends PublishFields {
  slug: string;
  title: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  faq: ArticleFaq[];
  body: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function articlesDir(): string {
  const candidates = [
    path.join(process.cwd(), "content", "articles"),
    path.join(process.cwd(), "apps", "web", "content", "articles"),
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) throw new Error("content/articles was not found (looked next to the web app and at apps/web/content/articles)");
  return found;
}

function str(data: Record<string, unknown>, key: string, file: string): string {
  const v = data[key];
  if (typeof v !== "string" || !v.trim()) throw new Error(`${file}: ${key} is required`);
  return v.trim();
}

/** YAML may parse a bare YYYY-MM-DD as a Date. Keep the calendar day in UTC. */
function day(data: Record<string, unknown>, file: string): string {
  const v = data.date;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return str(data, "date", file);
}

function keywords(data: Record<string, unknown>, file: string): string[] {
  const v = data.secondary_keywords;
  if (!Array.isArray(v) || v.some((k) => typeof k !== "string" || !k.trim())) throw new Error(`${file}: secondary_keywords must be a list of strings`);
  return v.map((k) => k.trim());
}

function faqOf(data: Record<string, unknown>, file: string): ArticleFaq[] {
  const v = data.faq;
  if (!Array.isArray(v) || v.length === 0) throw new Error(`${file}: faq must list at least one question`);
  return v.map((item, i) => {
    if (!item || typeof item !== "object") throw new Error(`${file}: faq[${i}] is not a question`);
    const row = item as Record<string, unknown>;
    if (typeof row.question !== "string" || !row.question.trim() || typeof row.answer !== "string" || !row.answer.trim()) {
      throw new Error(`${file}: faq[${i}] needs question and answer`);
    }
    return { question: row.question.trim(), answer: row.answer.trim() };
  });
}

function readOne(file: string): Article {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const slug = str(data, "slug", file);
  if (!SLUG.test(slug)) throw new Error(`${file}: slug must be lowercase words separated by hyphens`);
  const base = path.basename(file, ".md");
  if (base !== slug) throw new Error(`${file}: file name must be ${slug}.md`);
  const rawAt = data.publish_at;
  if (rawAt instanceof Date) throw new Error(`${file}: quote publish_at ("2026-11-10T13:00:00+07:00") so the timezone is kept`);
  const publish_at = rawAt == null || rawAt === "" ? null : str(data, "publish_at", file);
  const article: Article = {
    slug,
    title: str(data, "title", file),
    metaDescription: str(data, "meta_description", file),
    primaryKeyword: str(data, "primary_keyword", file),
    secondaryKeywords: keywords(data, file),
    date: day(data, file),
    publish_at,
    faq: faqOf(data, file),
    body: parsed.content.trim(),
  };
  publishTimeMs(article); // reject a bad publish_at or date at load
  return article;
}

/** Every article file, including ones whose publish_at is still in the future. index.md is the batch note and is not an article. */
export function loadAllArticles(): Article[] {
  const dir = articlesDir();
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".md") && name !== "index.md").sort();
  const articles = files.map((name) => readOne(path.join(dir, name)));
  const slugs = articles.map((a) => a.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error("duplicate article slugs");
  return articles;
}

export function getArticle(slug: string): Article | undefined {
  return loadAllArticles().find((a) => a.slug === slug);
}

/** Articles a visitor can see at `now`. This is the only list the index, sitemap, RSS, llms files and related links may use. */
export function listPublishedArticles(now = Date.now()): Article[] {
  return loadAllArticles()
    .filter((a) => isPublished(a, now))
    .sort((a, b) => publishTimeMs(a) - publishTimeMs(b) || a.title.localeCompare(b.title));
}

export function isPublishedArticle(slug: string, now = Date.now()): boolean {
  const article = getArticle(slug);
  return !!article && isPublished(article, now);
}

/** False when `pathname` is an article URL that is missing or not yet public. Other paths are left alone. */
export function isListedPath(pathname: string, now = Date.now()): boolean {
  if (!pathname.startsWith("/articles/")) return true;
  const slug = pathname.slice("/articles/".length);
  if (!slug || slug.includes("/")) return true;
  return isPublishedArticle(slug, now);
}

export function articlePath(article: Article): string {
  return `/articles/${article.slug}`;
}

/** Full text of the articles that are public right now, for /llms-full.txt. */
export function publishedArticlesMarkdown(site: string, now = Date.now()): string {
  const articles = listPublishedArticles(now);
  if (!articles.length) return "";
  const blocks = articles.map((a) => {
    const faq = a.faq.map((f) => `### ${f.question}\n\n${f.answer}`).join("\n\n");
    return [`# ${a.title}`, "", `Source: ${site}${articlePath(a)}`, "", a.body, "", "## FAQ", "", faq].join("\n");
  });
  return ["## Articles", "", "Published guides. A file with a future publish_at is left out until that time.", "", ...blocks].join("\n\n");
}

/** Short link list for /llms.txt. */
export function publishedArticlesIndex(site: string, now = Date.now()): string {
  const articles = listPublishedArticles(now);
  if (!articles.length) return "";
  return articles.map((a) => `- [${a.title}](${site}${articlePath(a)}): ${a.metaDescription}`).join("\n");
}
