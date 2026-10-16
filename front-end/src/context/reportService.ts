import api from "./apiClient";

export type ReportStatus =
  | "reported"
  | "verification"
  | "confirmed"
  | "handled"
  | "resolved"
  | "rejected";

export type ReportSeverity = "low" | "medium" | "high";

export interface ReportCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  is_active?: boolean;
}

export interface ReportMediaItem {
  id: string;
  report_id: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
  url?: string;
}

export interface ReportVerificationItem {
  id: string;
  report_id: string;
  action: string;
  note?: string;
  created_at?: string;
  moderator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ReportItem {
  id: string;
  user_id?: string;
  category_id: string;
  area_id?: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  status: ReportStatus;
  severity: ReportSeverity;
  occurred_at?: string;
  confirmed_at?: string;
  resolved_at?: string;
  created_at?: string;
  updated_at?: string;
  confirmations_count?: number;
  category?: ReportCategoryItem;
  area?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  media?: ReportMediaItem[];
  verifications?: ReportVerificationItem[];
}

export interface ReportQueryParams {
  search?: string;
  category_id?: string;
  status?: string;
  severity?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  per_page?: number;
}

export async function getReports(params?: ReportQueryParams): Promise<{
  data: ReportItem[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}> {
  const res = await api.get("/reports", { params });
  const payload = res.data?.data;
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];

  return {
    data: items,
    meta: {
      total: payload?.total ?? items.length,
      current_page: payload?.current_page ?? 1,
      last_page: payload?.last_page ?? 1,
      per_page: payload?.per_page ?? 20,
    },
  };
}

export async function getReportCategories(): Promise<ReportCategoryItem[]> {
  const res = await api.get("/report-categories");
  return res.data?.data ?? [];
}

export async function getReport(id: string): Promise<ReportItem> {
  const res = await api.get(`/reports/${id}`);
  return res.data?.data;
}

export async function createReport(data: FormData): Promise<ReportItem> {
  const res = await api.post("/reports", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data?.data;
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
  note?: string
): Promise<ReportItem> {
  const res = await api.patch(`/reports/${id}/status`, { status, note });
  return res.data?.data;
}

export async function uploadReportMedia(
  id: string,
  files: File[]
): Promise<ReportMediaItem[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images[]", file);
  });

  const res = await api.post(`/reports/${id}/media`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data?.data ?? [];
}

export async function confirmReport(
  id: string,
  type: "agree" | "disagree",
  note?: string
): Promise<{ confirmations_count: number }> {
  const res = await api.post(`/reports/${id}/confirm`, { type, note });
  return res.data?.data;
}
