import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { listSchemes, SchemeListItem } from "@/services/mutualFundService";
import { FILTER_DEFINITIONS_BY_ID } from "@/data/filters";
import { MoveUp, MoveDown, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { saveUserFilters, updateUserFilters } from "@/services/userService";
const LIMIT = 15;
const SKELETON_ROWS = 10;
const DEFAULT_TITLE = "Mutual Funds Screener";
const DEFAULT_DESCRIPTION =
  "Add a note explaining the purpose behind creating this - such as \"Top 5 ELSS funds for tax saving,\" \"High-performing mid-cap funds,\" or \"My SIP growth selections.\"";

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
  onMetaChange?: (meta: Record<string, { min: number | null; max: number | null }> | undefined) => void;
  resetToken?: number;
  initialTitle?: string;
  initialDescription?: string;
  initialSortField?: string | null;
  initialSortOrder?: "asc" | "desc" | null;
  restoredFilterExternalId?: string | null;
  onSavedFilterCreated?: (externalId: string) => Promise<void> | void;
}

const FundTable = ({
  filters,
  enabledFilters,
  onMetaChange,
  resetToken,
  initialTitle,
  initialDescription,
  initialSortField,
  initialSortOrder,
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(routeSavedFilterId ?? null);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const formatNumber = (val: number) => {
    return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const fetchPage = async (nextOffset: number, append: boolean) => {
    setLoading(true);
    setError(null);
    if (!append) {
      setItems([]);
      setTotal(0);
    }
    try {
      const payload: {
        filters: Record<string, Record<string, number | string | string[]>>;
        sort_field?: string;
        sort_order?: "asc" | "desc";
      } = { filters };
      if (sortKey) {
        payload.sort_field = String(sortKey);
        payload.sort_order = sortDir;
      }
      const response = await listSchemes(payload, { limit: LIMIT, offset: nextOffset });
      setTotal(response.total);
      setItems((prev) => (append ? [...prev, ...response.items] : response.items));
      if (!append && onMetaChange) {
        onMetaChange(response.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
      if (!append) {
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(0, false);
  }, [filterKey, sortKey, sortDir]);

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

  const canLoadMore = items.length < total;
  const displayTitle = title.trim() || DEFAULT_TITLE;
  const displayDescription = description.trim() || DEFAULT_DESCRIPTION;
  const canSaveScreen = title.trim().length > 0 && description.trim().length > 0;
  const savedFilterExternalId = activeSavedFilterId ?? routeSavedFilterId ?? null;
  const hasSavedScreen = Boolean(savedFilterExternalId);

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
    setSaveError(null);
    setActiveSavedFilterId(null);
  }, [resetToken]);

  useEffect(() => {
    if (!savedFilterExternalId) return;
    if (restoredFilterExternalId !== savedFilterExternalId) return;
    if (typeof initialTitle === "string") {
      setTitle(initialTitle.trim());
    }
    if (typeof initialDescription === "string") {
      setDescription(initialDescription.trim());
    }
    if (initialSortField) {
      setSortKey(initialSortField as keyof SchemeListItem);
      setSortDir(initialSortOrder ?? "desc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
  }, [
    savedFilterExternalId,
    restoredFilterExternalId,
    initialTitle,
    initialDescription,
    initialSortField,
    initialSortOrder,
  ]);

  const openEditor = () => {
    setDraftTitle(title);
    setDraftDescription(description);
    setEditorOpen(true);
  };

  const applyDraft = () => {
    setTitle(draftTitle.trim());
    setDescription(draftDescription.trim());
    setSaveError(null);
    setEditorOpen(false);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!user) {
      setSaveError("Please sign in to save your filters.");
      return;
    }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const payload: {
        name: string;
        description: string;
        filters: Record<string, Record<string, number | string | string[]>>;
        sort_field?: string;
        sort_order?: "asc" | "desc";
        enabled_filters: string[];
      } = {
        name: displayTitle,
        description: displayDescription,
        filters,
        enabled_filters: enabledFilters,
      };
      if (sortKey) {
        payload.sort_field = String(sortKey);
        payload.sort_order = sortDir;
      }
      if (savedFilterExternalId) {
        await updateUserFilters(token, savedFilterExternalId, payload);
      } else {
        const response = (await saveUserFilters(token, payload)) as { external_id?: string };
        if (response?.external_id) {
          setActiveSavedFilterId(response.external_id);
          navigate(`/filters/${response.external_id}`, { replace: true });
          await onSavedFilterCreated?.(response.external_id);
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save filters.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {editorOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center px-4"
          onClick={() => setEditorOpen(false)}
        >
          <div
            className="w-[min(92vw,420px)] h-[min(92vw,420px)] max-h-[85vh] overflow-auto rounded-md border border-border bg-[#fafafa] shadow-2xl p-4 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid gap-4 flex-1">
              <div className="grid gap-1">
                <Label htmlFor="screen-title">Name</Label>
                <Input
                  id="screen-title"
                  value={draftTitle}
                  placeholder={DEFAULT_TITLE}
                  onChange={(event) => setDraftTitle(event.target.value)}
                />
              </div>
              <div className="grid gap-1 flex-1 min-h-0">
                <Label htmlFor="screen-description">Description</Label>
                <textarea
                  id="screen-description"
                  value={draftDescription}
                  placeholder={DEFAULT_DESCRIPTION}
                  rows={9}
                  className="w-full h-full min-h-[190px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  onChange={(event) => setDraftDescription(event.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 mt-auto">
                <button
                  className="px-3 py-1.5 text-[12px] border border-border rounded-md hover:bg-surface-hover transition-colors"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-[12px] bg-foreground text-background rounded-md font-medium hover:bg-foreground/90 transition-colors"
                  onClick={applyDraft}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-[18px] font-semibold text-foreground tracking-tight">
              {displayTitle}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
              {displayDescription}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              className="p-2 border border-border rounded-md hover:bg-surface-hover transition-colors"
              onClick={openEditor}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              className="px-4 py-2 bg-foreground text-background rounded-md text-[13px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || !canSaveScreen}
            >
              {saving ? (hasSavedScreen ? "Updating..." : "Saving...") : hasSavedScreen ? "Update" : "Save"}
            </button>
          </div>
        </div>
        {saveError && <div className="mt-2 text-xs text-negative">{saveError}</div>}
        <div className="flex items-center justify-between mt-3">
          <p className="text-[13px]">
            <span className="text-muted-foreground">Showing </span>
            <span className="text-primary font-medium">1 - {items.length}</span>
            <span className="text-muted-foreground"> of </span>
            <span className="text-primary font-medium">{total}</span>
            <span className="text-muted-foreground"> results</span>
          </p>
        </div>

      </div>

      <div className="flex-1 min-h-0">
        <div className="h-full w-full overflow-auto scrollbar-thin">
          <table className="w-full min-w-max table-fixed border-separate border-spacing-0">
          <colgroup>
            {columns.map((col) => (
              <col
                key={String(col.key)}
                className={col.key === "scheme_sub_name" ? "w-[200px]" : "w-[140px]"}
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
                  className={`sticky top-0 z-20 px-3 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-normal break-words leading-normal table-header-bg bg-background shadow-[0_1px_0_0_hsl(var(--border))] cursor-pointer select-none hover:text-foreground text-center group ${
                    col.key === "scheme_sub_name" ? "sticky left-0 z-40" : ""
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>{col.label}</span>
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <MoveUp  className="w-3 h-3 text-foreground" strokeWidth={1.5} />
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
                      <td key={`${rowIndex}-${String(col.key)}`} className="px-3 py-3">
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
                        className={`px-3 py-3 transition-colors ${col.key === "scheme_sub_name" ? "sticky left-0 z-10 bg-background sticky-cell" : ""}`}
                      >
                        <Link
                          to={schemePath}
                          className="block text-[13px] font-medium text-foreground hover:no-underline cursor-pointer"
                        >
                          {typeof value === "string" && value ? value : "-"}
                        </Link>
                      </td>
                        );
                      }

                      return (
                        <td
                          key={String(col.key)}
                          className={`px-3 py-3 text-[13px] text-center text-foreground ${
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

          {error && <div className="p-4 text-sm text-negative">{error}</div>}
          {!loading && items.length === 0 && !error && (
            <div className="p-4 text-sm text-muted-foreground">No schemes found.</div>
          )}

          <div className="p-4 flex justify-center">
            {canLoadMore && (
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
