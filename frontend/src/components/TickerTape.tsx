import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";

const UP_ARROW = "\u25B2";
const DOWN_ARROW = "\u25BC";
const SESSION_KEY = "mf_leaderboards_ticker";
const LEADERBOARDS_SESSION_KEY = "mf_leaderboards_cache";
const LEADERBOARDS_LOADING_EVENT = "mf_leaderboards_loading";
const TICKER_PIXELS_PER_SECOND = 40;
const MIN_TICKER_DURATION_SECONDS = 12;
const MAX_TICKER_DURATION_SECONDS = 45;

const TickerTape = () => {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [direction, setDirection] = useState<"normal" | "reverse">("normal");
  const [tickerLoading, setTickerLoading] = useState(true);
  const [isTickerPaused, setIsTickerPaused] = useState(false);
  const [tickerDuration, setTickerDuration] = useState(30);
  const tickerTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadFromSession = () => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as TickerItem[];
        if (!Array.isArray(parsed)) return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const saveToSession = (items: TickerItem[]) => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(items));
      } catch {
        // Ignore storage errors
      }
    };

    const saveLeaderboards = (items: LeaderboardResponse["items"]) => {
      try {
        sessionStorage.setItem(LEADERBOARDS_SESSION_KEY, JSON.stringify(items));
        window.dispatchEvent(new Event("mf_leaderboards_updated"));
      } catch {
        // Ignore storage errors
      }
    };

    const loadLeaderboards = () => {
      try {
        const raw = sessionStorage.getItem(LEADERBOARDS_SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LeaderboardResponse["items"];
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const loadTicker = async () => {
      const cached = loadFromSession();
      const leaderboardsCached = loadLeaderboards();
      if (cached && cached.length > 0) {
        setTickerItems(cached);
        setTickerLoading(false);
        if (leaderboardsCached) {
          return;
        }
      }

      try {
        if (!leaderboardsCached) {
          window.dispatchEvent(
            new CustomEvent(LEADERBOARDS_LOADING_EVENT, { detail: { loading: true } }),
          );
        }
        const data = await apiGet<LeaderboardResponse>("/api/v1/schemes/leaderboards", undefined, {
          signal: controller.signal,
        });
        const gainers = data.items?.top_gainers ?? [];
        const losers = data.items?.top_losers ?? [];
        const mapped = [
          ...gainers.map((item) => mapLeaderboardItem(item)),
          ...losers.map((item) => mapLeaderboardItem(item)),
        ];

        setTickerItems(mapped);
        if (mapped.length > 0) {
          saveToSession(mapped);
        }
        if (data.items) {
          saveLeaderboards(data.items);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to load ticker data", error);
      } finally {
        setTickerLoading(false);
        if (!leaderboardsCached) {
          window.dispatchEvent(
            new CustomEvent(LEADERBOARDS_LOADING_EVENT, { detail: { loading: false } }),
          );
        }
      }
    };

    loadTicker();

    return () => controller.abort();
  }, []);

  const items = useMemo(() => {
    if (tickerItems.length === 0) return [];
    return [...tickerItems, ...tickerItems];
  }, [tickerItems]);

  useLayoutEffect(() => {
    const updateTickerDuration = () => {
      const track = tickerTrackRef.current;
      if (!track) return;
      const oneCycleDistance = track.scrollWidth / 2;
      if (oneCycleDistance <= 0) return;

      const rawDuration = oneCycleDistance / TICKER_PIXELS_PER_SECOND;
      const clampedDuration = Math.min(
        MAX_TICKER_DURATION_SECONDS,
        Math.max(MIN_TICKER_DURATION_SECONDS, rawDuration),
      );
      setTickerDuration(clampedDuration);
    };

    updateTickerDuration();

    const track = tickerTrackRef.current;
    if (!track || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateTickerDuration);
      return () => window.removeEventListener("resize", updateTickerDuration);
    }

    const observer = new ResizeObserver(() => updateTickerDuration());
    observer.observe(track);
    window.addEventListener("resize", updateTickerDuration);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTickerDuration);
    };
  }, [items.length]);

  return (
    <div className="h-8 bg-nav border-b border-nav-hover overflow-hidden flex items-center relative z-[70]">
      <button
        type="button"
        aria-label="Scroll ticker left"
        onClick={() => setDirection("reverse")}
        className="absolute left-0 z-10 h-full px-1.5 bg-nav border-r border-nav-foreground/10 hover:bg-nav-hover transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5 text-nav-foreground/50" />
      </button>
      <div
        ref={tickerTrackRef}
        className="flex animate-ticker whitespace-nowrap ml-8 mr-8"
        style={{
          animationDirection: direction,
          animationDuration: `${tickerDuration}s`,
          animationPlayState: isTickerPaused ? "paused" : "running",
        }}
        onMouseEnter={() => setIsTickerPaused(true)}
        onMouseLeave={() => setIsTickerPaused(false)}
      >
        {tickerLoading && items.length === 0 ? (
          <div className="flex items-center gap-6 px-4 py-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`ticker-skeleton-${index}`} className="flex items-center gap-2">
                <Skeleton className="h-3 w-28 bg-nav-hover/80" />
                <Skeleton className="h-3 w-14 bg-nav-hover/80" />
                <Skeleton className="h-3 w-12 bg-nav-hover/80" />
              </div>
            ))}
          </div>
        ) : (
          items.map((item, i) => {
            const content = (
              <>
                <span className="font-medium text-nav-foreground tracking-tight">{item.name}</span>
                <span className={item.isPositive ? "text-positive" : "text-negative"}>
                  {item.isPositive ? UP_ARROW : DOWN_ARROW} {item.change.toFixed(2)}%
                </span>
              </>
            );

            return item.schemeId ? (
              <Link
                key={`${item.schemeId}-${i}`}
                to={getSchemePath(item.schemeId, item.name)}
                className="flex items-center gap-1.5 px-4 text-xs hover:opacity-90 transition-opacity"
              >
                {content}
              </Link>
            ) : (
              <div key={i} className="flex items-center gap-1.5 px-4 text-xs">
                {content}
              </div>
            );
          })
        )}
      </div>
      <button
        type="button"
        aria-label="Scroll ticker right"
        onClick={() => setDirection("normal")}
        className="absolute right-0 z-10 h-full px-1.5 bg-nav border-l border-nav-foreground/10 hover:bg-nav-hover transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5 text-nav-foreground/50" />
      </button>
    </div>
  );
};

type LeaderboardItem = {
  external_id: string;
  scheme_code: number;
  scheme_sub_name: string;
  nav_change_1d?: number;
  cagr_3y?: number | null;
};

type LeaderboardResponse = {
  items: {
    top_gainers: LeaderboardItem[];
    top_losers: LeaderboardItem[];
    best_performers?: LeaderboardItem[];
  };
};

type TickerItem = {
  name: string;
  change: number;
  isPositive: boolean;
  schemeId?: string | number;
};

const toSchemeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getSchemePath = (schemeId: string | number, name: string) => {
  const schemeSlug = toSchemeSlug(name || "scheme");
  return `/${schemeSlug}/${schemeId}`;
};

const mapLeaderboardItem = (item: LeaderboardItem): TickerItem => {
  const change = item.nav_change_1d ?? 0;

  return {
    name: item.scheme_sub_name,
    change: Math.abs(change),
    isPositive: change >= 0,
    schemeId: item.external_id ?? item.scheme_code,
  };
};

export default TickerTape;
