import api from "./apiClient";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "admin" | "user";
  joinedDate: string;
  activityCount?: number;
}

export interface UserApi {
  id: string | number;
  name: string;
  email: string;
  image?: string | null;
  profile_image?: string | null;
  role: string;
  joinedDate?: string;
  created_at?: string;
}


export interface UserBusiness {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  image: string | null;
  created_at: string;
}

export interface UserReport {
  id: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  severity: string;
  category_id: string | null;
  area_id: string | null;
  occurred_at: string | null;
  confirmed_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface UserVendorRoute {
  id: string;
  name: string;
  waypoints: Array<{ lat: number; lng: number; name?: string; stop_duration?: number }>;
  route_geometry: [number, number][] | null;
  distance: number | null;
  estimated_duration: number | null;
  status: string | null;
  is_shared: boolean;
  business: { id: string; name: string } | null;
  created_at: string;
}

export interface UserDetailApi extends UserApi {
  businesses_count: number;
  reports_count: number;
  vendorRoutes_count: number;
  businesses: UserBusiness[];
  reports: UserReport[];
  vendorRoutes: UserVendorRoute[];
}

export interface UserDetailResponse {
  success: boolean;
  message: string;
  data: UserDetailApi;
}

export interface ManagedUserDetail extends ManagedUser {
  businesses_count: number;
  reports_count: number;
  vendorRoutes_count: number;
  businesses: UserBusiness[];
  reports: UserReport[];
  vendorRoutes: UserVendorRoute[];
}


export interface UserFilters {
  search?: string;
  role?: "admin" | "user" | "";
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
}

export interface UserSingleResponse {
  success: boolean;
  message: string;
  data: UserApi;
}



export interface UserListResponse {
  success: boolean;
  message: string;
  data: {
    mete: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
    Data: UserApi[];
  };
}


export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: "admin" | "user";
  profile_image?: File | null;
}

export const getStorageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `http://127.0.0.1:8000/storage/${cleanPath}`;
};

export const formatUser = (user: UserApi): ManagedUser => {
  const rawImage = user.image ?? user.profile_image ?? null;
  const rawDate = user.joinedDate ?? user.created_at ?? null;

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    image: getStorageUrl(rawImage),
    role: user.role === "admin" ? "admin" : "user",
    joinedDate: rawDate
      ? new Date(rawDate).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "-",
  };
};

export const getCurrentUser = async (): Promise<ManagedUser> => {
  const response = await api.get<UserSingleResponse>("/auth/user");
  return formatUser(response.data.data);
};

export const getProfile = getCurrentUser;

 export const formatUserDetail = (user: UserDetailApi): ManagedUserDetail => {
    return {
      ...formatUser(user),
      businesses_count: user.businesses_count ?? 0,
      reports_count: user.reports_count ?? 0,
      vendorRoutes_count: user.vendorRoutes_count ?? 0,
      businesses: (user.businesses ?? []).map((business) => ({
        ...business,
        image: getStorageUrl(business.image),
      })),
      reports: user.reports ?? [],
      vendorRoutes: user.vendorRoutes ?? [],
    };
  };

export const getUsers = async (
  filters: UserFilters = {},
): Promise<{
  users: ManagedUser[];
  meta: UserListResponse["data"]["mete"];
}> => {
  const response = await api.get<UserListResponse>("/users", {
    params: filters,
  });

  const payload = response.data.data;

  return {
    users: payload.Data.map(formatUser),
    meta: payload.mete,
  };
};



export const getUserById = async (
  id: string,
): Promise<ManagedUserDetail> => {
  const response = await api.get<UserDetailResponse>(`/users/${id}`);

  return formatUserDetail(response.data.data);
};

export const updateUser = async (
  id: string,
  data: UpdateUserData
): Promise<ManagedUser> => {
  if (data.profile_image instanceof File) {
    const formData = new FormData();
    formData.append("_method", "PUT");
    if (data.name) formData.append("name", data.name);
    if (data.email) formData.append("email", data.email);
    if (data.role) formData.append("role", data.role);
    formData.append("profile_image", data.profile_image);

    const response = await api.post<UserSingleResponse>(
      `/users/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return formatUser(response.data.data);
  } else {
    const payload: Record<string, string> = {};
    if (data.name) payload.name = data.name;
    if (data.email) payload.email = data.email;
    if (data.role) payload.role = data.role;

    const response = await api.put<UserSingleResponse>(
      `/users/${id}`,
      payload
    );
    return formatUser(response.data.data);
  }
};

export const updateProfile = async (
  id: string,
  data: UpdateUserData
): Promise<ManagedUser> => {
  return await updateUser(id, data);
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};
