import { Helmet } from "react-helmet-async";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";

export interface SeoProps {
  /** Page title. " | FundScreener" is appended automatically unless `rawTitle` is set. */
  title: string;
  description: string;
  /** Path beginning with "/" (e.g. "/blogs"). Used to build the canonical URL. */
  path: string;
  /** Absolute image URL for social cards. */
  image?: string;
  /** "website" (default) or "article". */
  type?: "website" | "article";
  /** If true, use `title` verbatim without appending the site name. */
  rawTitle?: boolean;
  /** Optional JSON-LD structured data object injected as a <script> tag. */
  jsonLd?: Record<string, unknown>;
}

const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

/**
 * Centralised <head> management. Renders a unique title, description, canonical
 * link, Open Graph / Twitter tags and optional JSON-LD for each page so that the
 * prerendered HTML (and crawlers) get distinct, descriptive metadata per route.
 */
export default function Seo({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  type = "website",
  rawTitle = false,
  jsonLd,
}: SeoProps) {
  const fullTitle = rawTitle ? title : `${title} | ${SITE_NAME}`;
  const canonical = `${SITE_URL}${path}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
