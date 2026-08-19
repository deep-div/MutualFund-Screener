import { apiGet } from "@/lib/apiClient";

export interface BlogContentBlock {
  type: "heading" | "subheading" | "paragraph" | "body" | "bullet" | "bullets" | "quote" | "image";
  value: string | string[];
}

export interface BlogItem {
  id: number;
  internal_id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  author_name: string;
  author_url: string | null;
  is_published: boolean;
  published_date: string;
  published_time: string;
  read_time: number;
  cover_image_url: string;
  tags: string[];
  content: BlogContentBlock[];
  created_at: string;
  updated_at: string;
}

export interface BlogsResponse {
  limit: number;
  offset: number;
  total: number;
  items: BlogItem[];
}

export const getBlogs = (params?: {
  limit?: number;
  offset?: number;
  category?: string;
  date?: string;
}) =>
  apiGet<BlogsResponse>("/api/v1/blogs", {
    limit: params?.limit ?? 10,
    offset: params?.offset ?? 0,
    ...(params?.category ? { category: params.category } : {}),
    ...(params?.date ? { date: params.date } : {}),
  });

export const getBlogBySlug = (publishedDate: string, category: string, slug: string) =>
  apiGet<BlogItem>(`/api/v1/blogs/${encodeURIComponent(publishedDate)}/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`);
