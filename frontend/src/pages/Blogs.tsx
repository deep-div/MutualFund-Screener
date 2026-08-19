import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Loader2, AlertCircle, Calendar, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import TickerTape from "@/components/TickerTape";
import Footer from "@/components/Footer";
import { getBlogs, BlogItem } from "@/services/blogService";

const LIMIT = 9;

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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.05 },
  }),
};

function BlogCard({ blog, index }: { blog: BlogItem; index: number }) {
  const navigate = useNavigate();
  const coverImage = blog.cover_image_url;
  const categoryLabel = CATEGORY_LABELS[blog.category] ?? blog.category;
  const categoryColor = CATEGORY_COLORS[blog.category] ?? "bg-slate-100 text-slate-600";

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      onClick={() => navigate(`/blogs/${blog.published_date}/${blog.category}/${blog.slug}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {coverImage ? (
          <img
            src={coverImage}
            alt={blog.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <BookOpen className="h-10 w-10 text-slate-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-primary transition-colors">
          {blog.title}
        </h2>
        <p className="line-clamp-3 flex-1 text-[13px] leading-relaxed text-slate-500">
          {blog.description}
        </p>

        {/* Meta + Read */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {blog.published_date && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Calendar className="h-3 w-3" />
                {new Date(blog.published_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            )}
            {blog.read_time && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                {blog.read_time} min read
              </span>
            )}
          </div>
          <span className="flex items-center gap-0.5 text-[12px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Read <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}

export default function Blogs() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlogs = useCallback(async (currentOffset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const data = await getBlogs({ limit: LIMIT, offset: currentOffset });

      setBlogs((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setOffset(currentOffset + data.items.length);
    } catch {
      setError("Failed to load blogs. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs(0, false);
  }, [fetchBlogs]);

  const hasMore = blogs.length < total;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Seo
        title="Mutual Fund Blog — Insights & Articles"
        description="Practical guides and articles on mutual funds, SIP planning, risk management, and smart long-term investing from FundScreener."
        path="/blogs"
      />
      <div className="sticky top-0 z-[90] bg-[#0f1729]">
        <TickerTape />
        <Navbar />
      </div>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">

          {/* Header */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">Blog</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.07 }}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Insights &amp; Articles
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.14 }}
              className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground"
            >
              Practical guides and articles to help you invest smarter in mutual funds.
            </motion.p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-8 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="h-48 w-full animate-pulse bg-slate-100" />
                  <div className="flex flex-col gap-3 p-5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Blog grid */}
          {!loading && blogs.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog, i) => (
                <BlogCard key={blog.id} blog={blog} index={i} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && blogs.length === 0 && !error && (
            <div className="py-20 text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-[14px]">No blogs published yet. Check back soon.</p>
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => fetchBlogs(offset, true)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>Load more</>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
