import { jsonLdString } from "@/lib/seo";

/** Structured data for crawlers (server-rendered). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
