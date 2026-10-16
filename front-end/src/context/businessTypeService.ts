import api from "./apiClient";

export interface BusinessTypeWeightItem {
  id?: string;
  business_type_id?: string;
  factor: string;
  weight: number;
}

export interface BusinessTypeItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  scale?: string | null;
  icon?: string | null;
  description?: string | null;
  default_radius_m: number;
  min_radius_m?: number | null;
  max_radius_m?: number | null;
  target_demographics?: Array<{ category: string; weight: number }> | null;
  competitor_categories?: string[] | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  weights?: BusinessTypeWeightItem[];
}

export interface BusinessTypeQueryParams {
  search?: string;
  category?: string;
  scale?: string;
  is_active?: boolean;
  all_status?: boolean;
  page?: number;
  per_page?: number;
}

export interface BusinessTypeCategoryCount {
  category: string;
  count: number;
}

export async function getBusinessTypes(params?: BusinessTypeQueryParams): Promise<{
  data: BusinessTypeItem[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}> {
  const res = await api.get("/business-types", {
    params: {
      ...params,
      all_status: true,
    },
  });

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

export async function getBusinessTypeCategories(): Promise<BusinessTypeCategoryCount[]> {
  const res = await api.get("/business-types/categories");
  return res.data?.data ?? [];
}

export async function getBusinessType(id: string): Promise<BusinessTypeItem> {
  const res = await api.get(`/business-types/${id}`);
  return res.data?.data;
}

export async function createBusinessType(
  data: Partial<BusinessTypeItem>
): Promise<BusinessTypeItem> {
  const res = await api.post("/business-types", data);
  return res.data?.data;
}

export async function updateBusinessType(
  id: string,
  data: Partial<BusinessTypeItem>
): Promise<BusinessTypeItem> {
  const res = await api.put(`/business-types/${id}`, data);
  return res.data?.data;
}

export async function deleteBusinessType(id: string): Promise<void> {
  await api.delete(`/business-types/${id}`);
}

export async function getBusinessTypeWeights(
  businessTypeId: string
): Promise<BusinessTypeWeightItem[]> {
  const res = await api.get(`/business-types/${businessTypeId}/weights`);
  return res.data?.data ?? [];
}

export async function syncBusinessTypeWeights(
  businessTypeId: string,
  weights: { factor: string; weight: number }[]
): Promise<BusinessTypeWeightItem[]> {
  const res = await api.post(`/business-types/${businessTypeId}/weights`, { weights });
  return res.data?.data ?? [];
}
