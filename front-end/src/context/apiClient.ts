import axios, { AxiosError } from "axios";

function resolveBaseUrl(): string {
    const configured = import.meta.env.VITE_APP_BACK_END as string | undefined;
    if (configured && configured.trim().length > 0) {
        return configured.replace(/\/$/, "");
    }
    return "/api";
}

export type ApiFailureKind =
    | "network"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "validation"
    | "rate_limited"
    | "server"
    | "unknown";

export function classifyApiError(error: unknown): {
    kind: ApiFailureKind;
    message: string;
    status?: number;
} {
    if (!axios.isAxiosError(error)) {
        return { kind: "unknown", message: "Terjadi kesalahan tak terduga." };
    }

    const axiosError = error as AxiosError<{ message?: string }>;
    const status = axiosError.response?.status;
    const serverMessage = axiosError.response?.data?.message;

    if (!axiosError.response) {
        return {
            kind: "network",
            message:
                "Tidak dapat menghubungi API Laravel. Pastikan server backend berjalan dan VITE_APP_BACK_END benar.",
        };
    }

    if (status === 401) {
        return { kind: "unauthorized", status, message: serverMessage || "Sesi habis. Silakan masuk kembali." };
    }
    if (status === 403) {
        return { kind: "forbidden", status, message: serverMessage || "Anda tidak memiliki izin." };
    }
    if (status === 404) {
        return { kind: "not_found", status, message: serverMessage || "Endpoint atau data tidak ditemukan." };
    }
    if (status === 422) {
        return { kind: "validation", status, message: serverMessage || "Data tidak valid." };
    }
    if (status === 429) {
        return { kind: "rate_limited", status, message: "Terlalu banyak permintaan. Coba beberapa saat lagi." };
    }
    if (status && status >= 500) {
        return { kind: "server", status, message: serverMessage || "Kesalahan server Laravel." };
    }

    return { kind: "unknown", status, message: serverMessage || axiosError.message };
}

const api = axios.create({
    baseURL: resolveBaseUrl(),
    timeout: 20000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
        }
        return Promise.reject(error);
    },
);

export default api;
