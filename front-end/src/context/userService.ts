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

export interface UserSingleResponse {
  success: boolean;
  message: string;
  data: UserApi;
}

export interface UserListResponse {
  success: boolean;
  message: string;
  data: {
    mete?: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
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

export const getUsers = async (): Promise<ManagedUser[]> => {
  const response = await api.get<UserListResponse>("/auth/users");
  const users = response.data.data.Data;
  return users.map(formatUser);
};

export const getUserById = async (id: string): Promise<ManagedUser> => {
  const response = await api.get<UserSingleResponse>(`/auth/users/${id}`);
  return formatUser(response.data.data);
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
      `/auth/users/${id}`,
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
      `/auth/users/${id}`,
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
  await api.delete(`/auth/users/${id}`);
};
