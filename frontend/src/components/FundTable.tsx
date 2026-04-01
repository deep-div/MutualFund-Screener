import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { listSchemes, SchemeListItem, SchemeSearchItem, searchSchemes } from "@/services/mutualFundService";
import { DEFAULT_ENABLED_FILTERS, FILTER_DEFINITIONS_BY_ID } from "@/data/filters";
import { MoveUp, MoveDown, Pencil, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { saveUserFilters, updateUserFilters } from "@/services/userService";
const LIMIT = 15;
const SKELETON_ROWS = 10;
const SCREEN_DEFAULT_TITLE = "Screener";
const SCREEN_DEFAULT_DESCRIPTION =
  "Describe the purpose of this screen (e.g., tax-saving, growth, or tracking)";
const WATCHLIST_DEFAULT_TITLE = "Watchlist";
const WATCHLIST_DEFAULT_DESCRIPTION =
  "Describe the purpose of this watchlist (e.g., long-term, high-risk, or SIP tracking)";
const TITLE_WORD_LIMIT = 8;
const DESCRIPTION_WORD_LIMIT = 25;
const USER_FILTER_ID_REGEX = /^[0-9a-f]{32}$/i;
const OPEN_AUTH_MODAL_EVENT = "mf_open_auth_modal";
const WATCHLIST_SEARCH_LIMIT = 12;
type BuilderType = "screen" | "watchlist";

const baseColumns: Array<{
  key: keyof SchemeListItem;
  label: string;
  align: "left" | "right" | "center";
}> = [
  { key: "scheme_sub_name", label: "Name", align: "left" },
  { key: "scheme_sub_category", label: "Sub Category", align: "left" },
  { key: "option_type", label: "Plan", align: "left" },
];

interface FundTableProps {
  filters: Record<string, Record<string, number | string | string[]>>;
  enabledFilters: string[];
  builderType?: BuilderType;
  activeCount?: number;
  onOpenMobileFilters?: () => void;
  onMetaChange?: (meta: Record<string, { min: number | null; max: number | null }> | undefined) => void;
  resetToken?: number;
  initialTitle?: string;
  initialDescription?: string;
  initialUpdatedAt?: string | null;
  initialSortField?: string | null;
  initialSortOrder?: "asc" | "desc" | null;
  initialExternalIds?: string[];
  restoredFilterExternalId?: string | null;
  onSavedFilterCreated?: (externalId: string) => Promise<void> | void;
}

const FundTable = ({
  filters,
  enabledFilters,
  builderType = "screen",
  activeCount = 0,
  onOpenMobileFilters,
  onMetaChange,
  resetToken,
  initialTitle,
  initialDescription,
  initialUpdatedAt,
  initialSortField,
  initialSortOrder,
  initialExternalIds,
  restoredFilterExternalId,
  onSavedFilterCreated,
}: FundTableProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { savedFilterId: routeSavedFilterId } = useParams<{ savedFilterId?: string }>();
  const [sortKey, setSortKey] = useState<keyof SchemeListItem | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [items, setItems] = useState<SchemeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveAction, setSaveAction] = useState<"save" | "update" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(routeSavedFilterId ?? null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showDescriptionToggle, setShowDescriptionToggle] = useState(false);
  const [watchlistExternalIds, setWatchlistExternalIds] = useState<string[]>([]);
  const [watchlistPickerOpen, setWatchlistPickerOpen] = useState(false);
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState("");
  const [watchlistSearchLoading, setWatchlistSearchLoading] = useState(false);
  const [watchlistSearchError, setWatchlistSearchError] = useState<string | null>(null);
  const [watchlistSearchResults, setWatchlistSearchResults] = useState<SchemeSearchItem[]>([]);
  const [watchlistSchemeNames, setWatchlistSchemeNames] = useState<Record<string, string>>({});
  const fetchRequestIdRef = useRef(0);
  const descriptionCollapsedRef = useRef<HTMLParagraphElement | null>(null);

  const countWords = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const limitByWordCount = (input: string, maxWords: number) => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    const words = trimmed.split(/\s+/);
    return words.slice(0, maxWords).join(" ");
  };

  const limitTypedInputByWordCount = (input: string, maxWords: number) => {
    const words = input.match(/\S+/g) ?? [];
    if (words.length <= maxWords) return input;
    return words.slice(0, maxWords).join(" ");
  };
  const isWatchlist = builderType === "watchlist";
  const normalizedWatchlistExternalIds = useMemo(() => {
    const seen = new Set<string>();
    const normalized: string[] = [];
    watchlistExternalIds.forEach((externalId) => {
      const value = String(externalId ?? "").trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      normalized.push(value);
    });
    return normalized;
  }, [watchlistExternalIds]);
  const watchlistExternalIdsKey = useMemo(
    () => JSON.stringify(normalizedWatchlistExternalIds),
    [normalizedWatchlistExternalIds]
  );

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const requiresAuthForFilters = useMemo(
    () => !user && enabledFilters.some((id) => !DEFAULT_ENABLED_FILTERS.includes(id)),
    [enabledFilters, user]
  );

  const formatNumber = (val: number) => {
    return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const formatLastUpdated = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  };

  const columns = useMemo(() => {
    const baseKeys = new Set(baseColumns.map((col) => String(col.key)));
    const dynamicColumns = enabledFilters
      .filter((id) => !baseKeys.has(id))
      .filter((id) => id !== "scheme_class")
      .map((id) => {
        const def = FILTER_DEFINITIONS_BY_ID[id];
        return {
          key: id as keyof SchemeListItem,
          label: def?.label ?? id,
          align: "center" as const,
        };
      });
    return baseColumns.map((col) => ({ ...col, align: "center" as const })).concat(dynamicColumns);
  }, [enabledFilters]);

  const toSchemeSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const getSchemePath = (fund: SchemeListItem) => {
    const externalId = fund.external_id;
    const schemeSlug = toSchemeSlug(fund.scheme_sub_name ?? "scheme");
    return externalId ? `/${schemeSlug}/${externalId}` : "#";
  };

  const addSchemeToWatchlist = (scheme: Pick<SchemeSearchItem, "external_id" | "scheme_sub_name">) => {
    const externalId = String(scheme.external_id ?? "").trim();
    if (!externalId) return;
    setWatchlistExternalIds((prev) => (prev.includes(externalId) ? prev : [...prev, externalId]));
    if (scheme.scheme_sub_name?.trim()) {
      setWatchlistSchemeNames((prev) => ({ ...prev, [externalId]: scheme.scheme_sub_name.trim() }));
    }
  };

  const removeSchemeFromWatchlist = (externalId: string) => {
    const normalized = String(externalId ?? "").trim();
    if (!normalized) return;
    setWatchlistExternalIds((prev) => prev.filter((id) => id !== normalized));
  };

  const fetchPage = async (nextOffset: number, append: boolean) => {
    const requestId = ++fetchRequestIdRef.current;
    if (requiresAuthForFilters) {
      setLoading(false);
      setError(null);
      setItems([]);
      setTotal(0);
      onMetaChange?.(undefined);
      return;
    }
    if (isWatchlist && normalizedWatchlistExternalIds.length === 0) {
      setLoading(false);
      setError(null);
      setItems([]);
      setTotal(0);
      onMetaChange?.(undefined);
      return;
    }
    setLoading(true);
    setError(null);
    if (!append) {
      setItems([]);
      setTotal(0);
    }
    try {
      const payload: {
        screens: Record<string, Record<string, number | string | string[]>>;
        sort_field?: string;
        sort_order?: "asc" | "desc";
      } = { screens: filters };
      if (sortKey) {
        payload.sort_field = String(sortKey);
        payload.sort_order = sortDir;
      }
      if (isWatchlist) {
        payload.scheme_external_id = normalizedWatchlistExternalIds;
      }
      const response = await listSchemes(payload, { limit: LIMIT, offset: nextOffset });
      if (requestId !== fetchRequestIdRef.current) return;
      setTotal(response.total);
      setItems((prev) => (append ? [...prev, ...response.items] : response.items));
      setWatchlistSchemeNames((prev) => {
        const next = { ...prev };
        response.items.forEach((item) => {
          const extId = String(item.external_id ?? "").trim();
          const name = String(item.scheme_sub_name ?? "").trim();
          if (extId && name) {
            next[extId] = name;
          }
        });
        return next;
      });
      if (!append && onMetaChange) {
        onMetaChange(response.meta);
      }
    } catch (err) {
      if (requestId !== fetchRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load data.");
      if (!append) {
        setItems([]);
        setTotal(0);
      }
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPage(0, false);
  }, [filterKey, sortKey, sortDir, requiresAuthForFilters, isWatchlist, watchlistExternalIdsKey]);

  useEffect(() => {
    if (!editorOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditorOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editorOpen]);

  useEffect(() => {
    if (!watchlistPickerOpen) return;
    const trimmed = watchlistSearchQuery.trim();
    if (!trimmed) {
      setWatchlistSearchResults([]);
      setWatchlistSearchLoading(false);
      setWatchlistSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setWatchlistSearchLoading(true);
      setWatchlistSearchError(null);
      try {
        const response = await searchSchemes(trimmed, {
          limit: WATCHLIST_SEARCH_LIMIT,
          offset: 0,
          signal: controller.signal,
        });
        setWatchlistSearchResults(Array.isArray(response.items) ? response.items : []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setWatchlistSearchResults([]);
        setWatchlistSearchError("Search failed. Please try again.");
      } finally {
        setWatchlistSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [watchlistSearchQuery, watchlistPickerOpen]);

  const canLoadMore = items.length < total;
  const defaultTitle = isWatchlist ? WATCHLIST_DEFAULT_TITLE : SCREEN_DEFAULT_TITLE;
  const defaultDescription = isWatchlist ? WATCHLIST_DEFAULT_DESCRIPTION : SCREEN_DEFAULT_DESCRIPTION;
  const displayTitle = title.trim() || defaultTitle;
  const displayDescription = description.trim() || defaultDescription;
  const canSaveScreen = title.trim().length > 0 && description.trim().length > 0;
  const draftTitleWordCount = countWords(draftTitle);
  const draftDescriptionWordCount = countWords(draftDescription);
  const editorNameLabel = isWatchlist ? "Watchlist Name" : "Screen Name";
  const resourceLabel = isWatchlist ? "watchlist" : "screen";
  const showEmptyWatchlistState = isWatchlist && !loading && normalizedWatchlistExternalIds.length === 0;
  const shouldLockTableScroll = requiresAuthForFilters || showEmptyWatchlistState;
  const showingFrom = total > 0 ? 1 : 0;
  const savedFilterExternalId = activeSavedFilterId ?? routeSavedFilterId ?? null;
  const hasSavedScreen = Boolean(
    savedFilterExternalId && USER_FILTER_ID_REGEX.test(savedFilterExternalId.trim())
  );
  const isNewScreen = !savedFilterExternalId && title.trim().length === 0 && description.trim().length === 0;

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [displayDescription]);

  useEffect(() => {
    if (headerLoading) return;

    const updateDescriptionToggle = () => {
      const node = descriptionCollapsedRef.current;
      if (!node) return;

      const hasOverflow = node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight + 1;
      setShowDescriptionToggle(hasOverflow);
    };

    const frame = window.requestAnimationFrame(updateDescriptionToggle);
    window.addEventListener("resize", updateDescriptionToggle);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateDescriptionToggle);
    };
  }, [displayDescription, headerLoading, isDescriptionExpanded]);

  useEffect(() => {
    setActiveSavedFilterId(routeSavedFilterId ?? null);
  }, [routeSavedFilterId]);

  useEffect(() => {
    setTitle("");
    setDescription("");
    setDraftTitle("");
    setDraftDescription("");
    setEditorOpen(false);
    setSaving(false);
    setSaveAction(null);
    setSaveError(null);
    setActiveSavedFilterId(null);
    setLastUpdatedAt(null);
    setWatchlistExternalIds([]);
    setWatchlistPickerOpen(false);
    setWatchlistSearchQuery("");
    setWatchlistSearchResults([]);
    setWatchlistSearchError(null);
    setHeaderLoading(true);
    const timer = window.setTimeout(() => setHeaderLoading(false), 250);
    return () => window.clearTimeout(timer);
  }, [resetToken]);

  useEffect(() => {
    if (!isNewScreen) {
      setHeaderLoading(false);
      return;
    }
    setHeaderLoading(true);
    const timer = window.setTimeout(() => setHeaderLoading(false), 250);
    return () => window.clearTimeout(timer);
  }, [isNewScreen]);

  useEffect(() => {
    if (!savedFilterExternalId) return;
    if (restoredFilterExternalId !== savedFilterExternalId) return;
    if (typeof initialTitle === "string") {
      setTitle(initialTitle.trim());
    }
    if (typeof initialDescription === "string") {
      setDescription(initialDescription.trim());
    }
    setLastUpdatedAt(initialUpdatedAt ?? null);
    if (initialSortField) {
      setSortKey(initialSortField as keyof SchemeListItem);
      setSortDir(initialSortOrder ?? "desc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
    setWatchlistExternalIds(Array.isArray(initialExternalIds) ? initialExternalIds : []);
  }, [
    savedFilterExternalId,
    restoredFilterExternalId,
    initialTitle,
    initialDescription,
    initialUpdatedAt,
    initialSortField,
    initialSortOrder,
    initialExternalIds,
  ]);

  const openEditor = () => {
    if (!user) {
      setSaveError(`Please sign in to edit and save ${resourceLabel}s.`);
      return;
    }
    setSaveError(null);
    setDraftTitle(limitByWordCount(title, TITLE_WORD_LIMIT));
    setDraftDescription(limitByWordCount(description, DESCRIPTION_WORD_LIMIT));
    setEditorOpen(true);
  };

  const applyDraft = () => {
    setTitle(limitByWordCount(draftTitle, TITLE_WORD_LIMIT));
    setDescription(limitByWordCount(draftDescription, DESCRIPTION_WORD_LIMIT));
    setSaveError(null);
    setEditorOpen(false);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!user) {
      setSaveError(`Please sign in to edit and save ${resourceLabel}s.`);
      return;
    }
    if (isWatchlist && normalizedWatchlistExternalIds.length === 0) {
      setSaveError("Add at least one fund before saving this watchlist.");
      return;
    }
    const shouldUpdateExisting = Boolean(savedFilterExternalId && hasSavedScreen);
    const action: "save" | "update" = shouldUpdateExisting ? "update" : "save";
    setSaveAction(action);
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const payload: {
        name: string;
        description: string;
        screens: Record<string, Record<string, number | string | string[]>>;
        sort_field?: string;
        sort_order?: "asc" | "desc";
        enabled_screens: string[];
        external_ids: string[];
      } = {
        name: displayTitle,
        description: displayDescription,
        screens: filters,
        enabled_screens: enabledFilters,
        external_ids: isWatchlist ? normalizedWatchlistExternalIds : [],
      };
      if (sortKey) {
        payload.sort_field = String(sortKey);
        payload.sort_order = sortDir;
      }
      if (shouldUpdateExisting && savedFilterExternalId) {
        const response = (await updateUserFilters(token, savedFilterExternalId, payload)) as {
          updated_at?: string;
        };
        if (typeof response?.updated_at === "string") {
          setLastUpdatedAt(response.updated_at);
        }
      } else {
        const response = (await saveUserFilters(token, payload)) as {
          external_id?: string;
          updated_at?: string;
        };
        if (typeof response?.updated_at === "string") {
          setLastUpdatedAt(response.updated_at);
        }
        if (response?.external_id) {
          setActiveSavedFilterId(response.external_id);
          navigate(`/filters/${response.external_id}`, { replace: true });
          await onSavedFilterCreated?.(response.external_id);
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : `Failed to save ${resourceLabel}.`);
    } finally {
      setSaving(false);
      setSaveAction(null);
    }
  };

  const formattedLastUpdated = lastUpdatedAt ? formatLastUpdated(lastUpdatedAt) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {editorOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center px-4"
          onClick={() => setEditorOpen(false)}
        >
          <div
            className="w-[min(92vw,396px)] max-h-[85vh] overflow-auto rounded-md border border-border bg-[#fafafa] shadow-2xl p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid gap-7">
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="screen-title">{editorNameLabel}</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {draftTitleWordCount}/{TITLE_WORD_LIMIT} words
                  </span>
                </div>
                <Input
                  id="screen-title"
                  value={draftTitle}
                  placeholder={defaultTitle}
                  onChange={(event) =>
                    setDraftTitle(limitTypedInputByWordCount(event.target.value, TITLE_WORD_LIMIT))
                  }
                />
              </div>
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="screen-description">Description</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {draftDescriptionWordCount}/{DESCRIPTION_WORD_LIMIT} words
                  </span>
                </div>
                <textarea
                  id="screen-description"
                  value={draftDescription}
                  placeholder={defaultDescription}
                  rows={4}
                  className="w-full min-h-[132px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  onChange={(event) =>
                    setDraftDescription(limitTypedInputByWordCount(event.target.value, DESCRIPTION_WORD_LIMIT))
                  }
                />
              </div>
              <div className="flex justify-end gap-4 pt-3">
                <button
                  className="w-24 px-3 py-2 text-[12px] border border-border rounded-md hover:bg-surface-hover transition-colors"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="w-24 px-3 py-2 text-[12px] bg-[#0f1729] text-white rounded-md font-medium hover:bg-[#0b1322] transition-colors"
                  onClick={applyDraft}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {watchlistPickerOpen && (
        <div
          className="fixed inset-0 z-[121] flex items-center justify-center bg-black/45 px-3 sm:px-4"
          onClick={() => setWatchlistPickerOpen(false)}
        >
          <div
            className="flex w-full max-w-[760px] max-h-[88vh] flex-col overflow-hidden rounded-xl border border-border bg-[#fafafa] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <h3 className="text-[16px] font-semibold text-foreground">Search and Add Funds</h3>
                <p className="text-[12px] text-muted-foreground">
                  Selected funds: {normalizedWatchlistExternalIds.length}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface-hover"
                onClick={() => setWatchlistPickerOpen(false)}
                aria-label="Close add funds dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid flex-1 min-h-0 gap-3 overflow-y-auto px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 scrollbar-mobile-hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={watchlistSearchQuery}
                  onChange={(event) => setWatchlistSearchQuery(event.target.value)}
                  placeholder="Search mutual funds to add"
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[13px] text-foreground outline-none ring-0 transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr] md:max-h-[44vh] md:min-h-[220px] md:gap-4 md:overflow-hidden">
                <div className="flex min-h-0 flex-col rounded-lg border border-border bg-background">
                  <div className="border-b border-border px-3 py-2 text-[12px] font-medium text-muted-foreground">
                    Search Results
                  </div>
                  <div className="min-h-[160px] max-h-[28vh] overflow-y-auto overflow-x-hidden p-2 md:h-full md:min-h-0 md:max-h-[36vh] scrollbar-mobile-hidden">
                    {watchlistSearchLoading ? (
                      <div className="space-y-2 p-1">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <Skeleton key={`watchlist-search-${idx}`} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : watchlistSearchError ? (
                      <p className="px-2 py-3 text-[12px] text-negative">{watchlistSearchError}</p>
                    ) : watchlistSearchQuery.trim().length === 0 ? (
                      <p className="px-2 py-3 text-[12px] text-muted-foreground">
                        Type a fund name to search.
                      </p>
                    ) : watchlistSearchResults.length === 0 ? (
                      <p className="px-2 py-3 text-[12px] text-muted-foreground">No funds found.</p>
                    ) : (
                      <div className="space-y-2">
                        {watchlistSearchResults.map((scheme) => {
                          const externalId = String(scheme.external_id ?? "").trim();
                          const isAdded = normalizedWatchlistExternalIds.includes(externalId);
                          return (
                            <div
                              key={externalId || scheme.scheme_sub_name}
                              className="flex flex-col gap-2 rounded-md border border-border bg-white px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-foreground whitespace-normal break-words leading-5">
                                  {scheme.scheme_sub_name}
                                </p>
                                <p className="text-[11px] text-muted-foreground whitespace-normal break-words leading-4">
                                  {scheme.scheme_sub_category}
                                </p>
                              </div>
                              <button
                                type="button"
                                className={`self-end shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors sm:self-auto ${
                                  isAdded
                                    ? "border border-border text-muted-foreground hover:bg-surface-hover"
                                    : "bg-[#0f1729] text-white hover:bg-[#0b1322]"
                                }`}
                                onClick={() => {
                                  if (!externalId) return;
                                  if (isAdded) {
                                    removeSchemeFromWatchlist(externalId);
                                  } else {
                                    addSchemeToWatchlist(scheme);
                                  }
                                }}
                              >
                                {isAdded ? "Remove" : "Add"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex min-h-0 flex-col rounded-lg border border-border bg-background">
                  <div className="border-b border-border px-3 py-2 text-[12px] font-medium text-muted-foreground">
                    Selected Funds
                  </div>
                  <div className="min-h-[160px] max-h-[28vh] overflow-y-auto overflow-x-hidden p-2 md:h-full md:min-h-0 md:max-h-[36vh] scrollbar-mobile-hidden">
                    {normalizedWatchlistExternalIds.length === 0 ? (
                      <p className="px-2 py-3 text-[12px] text-muted-foreground">No funds selected yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {normalizedWatchlistExternalIds.map((externalId) => (
                          <div
                            key={`selected-${externalId}`}
                            className="flex flex-col gap-2 rounded-md border border-border bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-foreground whitespace-normal break-words leading-5">
                                {watchlistSchemeNames[externalId] || "Selected fund"}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="self-end shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-hover sm:self-auto"
                              onClick={() => removeSchemeFromWatchlist(externalId)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end border-t border-border px-4 py-3 sm:px-5 sm:py-4">
              <button
                type="button"
                className="rounded-md bg-[#0f1729] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#0b1322] transition-colors"
                onClick={() => setWatchlistPickerOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="border-b border-border px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isHeaderCollapsed
              ? "max-h-0 opacity-0"
              : isDescriptionExpanded
                ? "max-h-[320px] opacity-100 sm:max-h-[260px]"
                : "max-h-40 opacity-100 sm:max-h-28"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0 sm:pr-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-1">
                {headerLoading ? (
                  <>
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-[360px]" />
                  </>
                ) : (
                  <>
                    <h1 className="text-[17px] font-semibold leading-tight tracking-tight text-foreground line-clamp-2 break-words sm:text-[18px] sm:line-clamp-none">
                      {displayTitle}
                    </h1>
                    {isDescriptionExpanded ? (
                      <p className="w-full text-[12px] leading-5 text-muted-foreground break-words sm:basis-full sm:text-[13px] sm:leading-relaxed">
                        {displayDescription}
                        {showDescriptionToggle && (
                          <>
                            {" "}
                            <button
                              type="button"
                              onClick={() => setIsDescriptionExpanded(false)}
                              className="text-[12px] font-medium text-primary sm:text-[13px]"
                            >
                              Read less
                            </button>
                          </>
                        )}
                      </p>
                    ) : (
                      <div className="flex min-w-0 items-baseline gap-1 sm:flex-1">
                        <p
                          ref={descriptionCollapsedRef}
                          className="min-w-0 flex-1 truncate text-[12px] leading-5 text-muted-foreground sm:text-[13px] sm:leading-relaxed"
                        >
                          {displayDescription}
                        </p>
                        {showDescriptionToggle && (
                          <button
                            type="button"
                            onClick={() => setIsDescriptionExpanded(true)}
                            className="shrink-0 text-[12px] font-medium text-primary sm:text-[13px]"
                          >
                            Read more
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="w-full shrink-0 sm:w-auto">
              <div
                className={`flex w-full items-center gap-2 ${
                  isWatchlist ? "justify-between" : "justify-end"
                } sm:w-auto sm:justify-end`}
              >
                {isWatchlist && (
                  <button
                    className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-surface-hover sm:px-3 sm:py-2 sm:text-[12px]"
                    onClick={() => setWatchlistPickerOpen(true)}
                    title="Search and add funds"
                  >
                    Add Funds
                  </button>
                )}
                <div className="flex items-center gap-2">
                  {onOpenMobileFilters && (
                    <button
                      type="button"
                      onClick={onOpenMobileFilters}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground sm:hidden"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filters ({activeCount})
                    </button>
                  )}
                  <button
                    className="rounded-md border border-border p-1.5 transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:p-2"
                    onClick={openEditor}
                    disabled={!user || saving}
                    title={!user ? `Sign in to edit this ${resourceLabel}` : `Edit ${resourceLabel}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    className="rounded-md bg-[#0f1729] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0b1322] disabled:opacity-60 sm:px-4 sm:py-2 sm:text-[13px]"
                    onClick={handleSave}
                    disabled={!user || saving || !canSaveScreen}
                    title={!user ? `Sign in to save this ${resourceLabel}` : undefined}
                  >
                    {saving
                      ? saveAction === "update"
                        ? "Updating..."
                        : "Saving..."
                      : hasSavedScreen
                        ? "Update"
                        : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-[13px]">
            <span className="text-muted-foreground">Showing </span>
            <span className="text-primary font-medium">{showingFrom} - {items.length}</span>
            <span className="text-muted-foreground"> of </span>
            <span className="text-primary font-medium">{total}</span>
            {/* <span className="text-muted-foreground"> results</span> */}
          </p>
          {formattedLastUpdated && (
            <p className="text-[11px] text-muted-foreground text-right">
              Last updated {formattedLastUpdated}
            </p>
          )}
        </div>
        {saveError && <div className="mt-3 text-xs text-negative">{saveError}</div>}
      </div>

      <div className="flex-1 min-h-0">
        <div
          className={`relative h-full w-full ${
            shouldLockTableScroll ? "overflow-hidden" : "overflow-auto scrollbar-thin"
          }`}
          onScroll={(event) => {
            const nextCollapsed = event.currentTarget.scrollTop > 24;
            setIsHeaderCollapsed((previous) =>
              previous === nextCollapsed ? previous : nextCollapsed
            );
          }}
        >
          <table className="w-full min-w-max table-fixed border-separate border-spacing-0">
            <colgroup>
              {columns.map((col) => (
                <col
                  key={String(col.key)}
                  className={col.key === "scheme_sub_name" ? "w-[160px] sm:w-[200px]" : "w-[110px] sm:w-[140px]"}
                />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-30 table-header-bg dimmable-header">
              <tr className="border-b border-border">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    onClick={() => {
                      const nextKey = col.key;
                      if (sortKey === nextKey) {
                        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setSortKey(nextKey);
                        setSortDir("desc");
                      }
                    }}
                    className={`sticky top-0 z-20 px-2 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-normal break-words leading-normal table-header-bg bg-background shadow-[0_1px_0_0_hsl(var(--border))] cursor-pointer select-none hover:text-foreground text-center group sm:px-3 sm:py-3 ${
                      col.key === "scheme_sub_name" ? "sticky left-0 z-40" : ""
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <span>{col.label}</span>
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <MoveUp className="w-3 h-3 text-foreground" strokeWidth={1.5} />
                        ) : (
                          <MoveDown className="w-3 h-3 text-foreground" strokeWidth={1.5} />
                        )
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
                {loading && items.length === 0
                  ? Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                      <tr key={`skeleton-${rowIndex}`} className="border-b border-border">
                        {columns.map((col) => (
                          <td key={`${rowIndex}-${String(col.key)}`} className="px-2 py-2.5 sm:px-3 sm:py-3">
                            <Skeleton
                              className={`h-3 ${
                                col.key === "scheme_sub_name"
                                  ? "w-48"
                                  : col.key === "scheme_sub_category"
                                    ? "w-40"
                                    : "w-24"
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  : items.map((fund, index) => (
                      <motion.tr
                        key={fund.external_id ?? `${fund.scheme_sub_name}-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-border table-row-hover transition-colors cursor-pointer group dimmable-row"
                      >
                        {columns.map((col) => {
                          const value = fund[col.key];
                          const schemePath = getSchemePath(fund);
                          if (col.key === "scheme_sub_name") {
                            return (
                              <td
                                key={String(col.key)}
                                className={`px-2 py-2.5 transition-colors sm:px-3 sm:py-3 ${col.key === "scheme_sub_name" ? "sticky left-0 z-10 bg-background sticky-cell" : ""}`}
                              >
                                <Link
                                  to={schemePath}
                                  className="block text-[12px] font-medium text-foreground hover:no-underline cursor-pointer sm:text-[13px]"
                                >
                                  {typeof value === "string" && value ? value : "-"}
                                </Link>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={String(col.key)}
                              className={`px-2 py-2.5 text-center text-[12px] text-foreground sm:px-3 sm:py-3 sm:text-[13px] ${
                                col.key === "scheme_sub_name" ? "sticky left-0 z-10 bg-background text-left" : ""
                              }`}
                            >
                              <Link to={schemePath} className="block">
                                {typeof value === "string" && value
                                  ? value
                                  : typeof value === "number"
                                    ? formatNumber(value)
                                    : "-"}
                              </Link>
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
            </tbody>
          </table>

          {requiresAuthForFilters && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
              <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-background/90 p-6 text-center shadow-md">
                <p className="text-[14px] font-semibold text-foreground">Sign in to apply filters</p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Create an account to unlock advanced filters and save your screens.
                </p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent(OPEN_AUTH_MODAL_EVENT))}
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-[#0f1729] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#0b1322] transition-colors"
                >
                  Sign in / Sign up
                </button>
              </div>
            </div>
          )}
          {!requiresAuthForFilters && error && (
            <div className="p-4 text-sm text-negative">{error}</div>
          )}
          {!requiresAuthForFilters && showEmptyWatchlistState && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
              <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-background/95 p-6 text-center shadow-md">
                <p className="text-[15px] font-semibold text-foreground">No funds added yet</p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Build this watchlist by searching and adding funds you want to track.
                </p>
                <button
                  type="button"
                  onClick={() => setWatchlistPickerOpen(true)}
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-[#0f1729] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#0b1322] transition-colors"
                >
                  Search and Add Funds
                </button>
              </div>
            </div>
          )}
          {!requiresAuthForFilters && !loading && items.length === 0 && !error && !showEmptyWatchlistState && (
            <div className="p-4 text-sm text-muted-foreground">No schemes found.</div>
          )}

          <div className="sticky left-0 w-full p-4 flex justify-center">
            {!requiresAuthForFilters && canLoadMore && (
              <button
                onClick={() => fetchPage(items.length, true)}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundTable;
