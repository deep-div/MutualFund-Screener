import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Tag,
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import TickerTape from "@/components/TickerTape";
import Footer from "@/components/Footer";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { getBlogBySlug, BlogItem, BlogContentBlock } from "@/services/blogService";

const CATEGORY_LABELS: Record<string, string> = {
  "mutual-funds": "Mutual Funds",
  "investment-basics": "Investment Basics",
  "sip-planning": "SIP Planning",
  "tax-saving": "Tax Saving",
  "retirement-planning": "Retirement Planning",
  "market-insights": "Market Insights",
  "risk-management": "Risk Management",
  "fund-analysis": "Fund Analysis",
};

const CATEGORY_COLORS: Record<string, string> = {
  "mutual-funds": "bg-blue-50 text-blue-700",
  "investment-basics": "bg-emerald-50 text-emerald-700",
  "sip-planning": "bg-violet-50 text-violet-700",
  "tax-saving": "bg-amber-50 text-amber-700",
  "retirement-planning": "bg-orange-50 text-orange-700",
  "market-insights": "bg-cyan-50 text-cyan-700",
  "risk-management": "bg-rose-50 text-rose-700",
  "fund-analysis": "bg-indigo-50 text-indigo-700",
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ContentBlock({ block }: { block: BlogContentBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-snug text-slate-900 first:mt-0">
          {block.value as string}
        </h2>
      );
    case "subheading":
      return (
        <h3 className="mt-6 mb-2 text-[17px] font-semibold leading-snug text-slate-800">
          {block.value as string}
        </h3>
      );
    case "paragraph":
    case "body":
      return (
        <p className="mb-4 text-[15px] leading-[1.85] text-slate-600">
          {block.value as string}
        </p>
      );
    case "bullet":
      return (
        <li className="mb-2 text-[15px] leading-[1.8] text-slate-600 marker:text-primary">
          {block.value as string}
        </li>
      );
    case "bullets": {
      const items = Array.isArray(block.value) ? block.value : [block.value as string];
      return (
        <ol className="mb-5 ml-5 list-decimal space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-[15px] leading-[1.8] text-slate-600">
              {item}
            </li>
          ))}
        </ol>
      );
    }
    case "quote":
      return (
        <blockquote className="my-6 border-l-4 border-primary/30 pl-5 text-[15px] italic leading-relaxed text-slate-500">
          {block.value as string}
        </blockquote>
      );
    case "image":
      return (
        <div className="my-6 overflow-hidden rounded-xl">
          <img
            src={block.value as string}
            alt=""
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      );
    default:
      return null;
  }
}

function groupBullets(blocks: BlogContentBlock[]) {
  const result: Array<{ type: "list"; items: BlogContentBlock[] } | BlogContentBlock> = [];
  let i = 0;
  while (i < blocks.length) {
    if (blocks[i].type === "bullet") {
      const group: BlogContentBlock[] = [];
      while (i < blocks.length && blocks[i].type === "bullet") {
        group.push(blocks[i]);
        i++;
      }
      result.push({ type: "list", items: group });
    } else {
      result.push(blocks[i]);
      i++;
    }
  }
  return result;
}

export default function BlogDetail() {
  const { publishedDate, category, slug } = useParams<{ publishedDate: string; category: string; slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<BlogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publishedDate || !category || !slug) return;
    setLoading(true);
    setError(null);
    getBlogBySlug(publishedDate, category, slug)
      .then(setBlog)
      .catch(() => setError("Blog not found or failed to load."))
      .finally(() => setLoading(false));
  }, [publishedDate, category, slug]);

  const content = blog?.content ?? [];
  const grouped = groupBullets(content);
  const coverImage = blog?.cover_image_url;
  const tags = blog?.tags ?? [];
  const categoryLabel = blog ? (CATEGORY_LABELS[blog.category] ?? blog.category) : "";
  const categoryColor = blog ? (CATEGORY_COLORS[blog.category] ?? "bg-slate-100 text-slate-600") : "";

  const canonicalPath =
    publishedDate && category && slug
      ? `/blogs/${publishedDate}/${category}/${slug}`
      : "/blogs";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {blog && (
        <Seo
          title={blog.title}
          description={blog.description}
          path={canonicalPath}
          image={blog.cover_image_url || undefined}
          type="article"
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.title,
            description: blog.description,
            ...(blog.cover_image_url ? { image: blog.cover_image_url } : {}),
            datePublished: blog.published_date,
            dateModified: blog.updated_at || blog.published_date,
            author: {
              "@type": "Person",
              name: blog.author_name || SITE_NAME,
              ...(blog.author_url ? { url: blog.author_url } : {}),
            },
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}${canonicalPath}`,
            },
            ...(blog.tags?.length ? { keywords: blog.tags.join(", ") } : {}),
          }}
        />
      )}
      <div className="sticky top-0 z-[90] bg-[#0f1729]">
        <TickerTape />
        <Navbar />
      </div>

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">

          {/* Back link */}
          <Link
            to="/blogs"
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Blogs
          </Link>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4 pt-2">
              <div className="h-7 w-3/4 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-64 w-full animate-pulse rounded-xl bg-slate-100" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <AlertCircle className="h-10 w-10 text-rose-400" />
              <p className="text-[14px] text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={() => navigate("/blogs")}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Browse all blogs
              </button>
            </div>
          )}

          {/* Blog content */}
          {blog && !loading && (
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              {/* Category + meta */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${categoryColor}`}>
                  {categoryLabel}
                </span>
                {blog.published_date && (
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(blog.published_date)}
                  </span>
                )}
                {blog.read_time && (
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {blog.read_time} min read
                  </span>
                )}
                {blog.author_name && (
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    {blog.author_name}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="mb-4 text-[26px] font-bold leading-tight text-slate-900 sm:text-[30px]">
                {blog.title}
              </h1>

              {/* Cover image */}
              {coverImage && (
                <div className="mb-8 overflow-hidden rounded-2xl">
                  <img
                    src={coverImage}
                    alt={blog.title}
                    className="w-full object-cover"
                    loading="eager"
                  />
                </div>
              )}

              {/* Body content */}
              <div>
                {grouped.map((item, i) => {
                  if ("type" in item && item.type === "list") {
                    return (
                      <ul key={i} className="mb-4 ml-5 list-disc space-y-1">
                        {(item as { type: "list"; items: BlogContentBlock[] }).items.map((b, j) => (
                          <ContentBlock key={j} block={b} />
                        ))}
                      </ul>
                    );
                  }
                  return <ContentBlock key={i} block={item as BlogContentBlock} />;
                })}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Back link bottom */}
              <div className="mt-10 flex justify-start border-t border-slate-100 pt-6">
                <Link
                  to="/blogs"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  All articles
                </Link>
              </div>
            </motion.article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
