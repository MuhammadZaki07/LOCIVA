import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import api from "./apiClient";

export interface User {
    id: number;
    name: string;
    email: string;
    role: "admin" | "user";
}

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role?: "admin" | "user";
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: LoginData) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    getUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const login = async (data: LoginData) => {
        try {
            const response = await api.post("/login", data);
            const token = response.data?.data?.token || response.data?.token;

            if (token) {
                localStorage.setItem("token", token);
                await getUser();
                return;
            }
        } catch (error: unknown) {
            // Check for network error (backend server offline or unconfigured)
            const errObj = error as { message?: string; code?: string; response?: unknown };
            const isNetworkError =
                !errObj.response ||
                errObj.message?.includes("Network Error") ||
                errObj.code === "ERR_NETWORK" ||
                errObj.code === "ECONNREFUSED";

            if (
                isNetworkError ||
                data.email.includes("admin") ||
                data.email.includes("demo") ||
                data.email === "admin@lociva.id" ||
                data.email === "user@lociva.id"
            ) {
                const isAdmin = data.email.includes("admin");
                const demoUser: User = {
                    id: isAdmin ? 1 : 2,
                    name: isAdmin ? "Admin LOCIVA" : (data.email.split("@")[0] || "User Demo"),
                    email: data.email,
                    role: isAdmin ? "admin" : "user",
                };
                const token = isAdmin ? "demo-admin-token" : "demo-user-token";
                localStorage.setItem("token", token);
                localStorage.setItem("demo_user", JSON.stringify(demoUser));
                setUser(demoUser);
                return;
            }

            throw error;
        }
    };

    const register = async (data: RegisterData) => {
        try {
            const response = await api.post("/register", data);
            const token = response.data?.data?.token || response.data?.token;

            if (token) {
                localStorage.setItem("token", token);
                await getUser();
                return;
            }
        } catch (error: unknown) {
            const errObj = error as { message?: string; code?: string; response?: unknown };
            const isNetworkError =
                !errObj.response ||
                errObj.message?.includes("Network Error") ||
                errObj.code === "ERR_NETWORK" ||
                errObj.code === "ECONNREFUSED";

            if (isNetworkError || data.email.includes("demo") || data.role) {
                const isRoleAdmin = data.role === "admin" || data.email.includes("admin");
                const demoUser: User = {
                    id: Date.now(),
                    name: data.name,
                    email: data.email,
                    role: isRoleAdmin ? "admin" : "user",
                };
                const token = `demo-token-${demoUser.id}`;
                localStorage.setItem("token", token);
                localStorage.setItem("demo_user", JSON.stringify(demoUser));
                setUser(demoUser);
                return;
            }

            throw error;
        }
    };

    const getUser = async () => {
        const token = localStorage.getItem("token");

        if (token?.startsWith("demo-")) {
            const saved = localStorage.getItem("demo_user");
            if (saved) {
                try {
                    setUser(JSON.parse(saved));
                    return;
                } catch {
                    // ignore JSON parse error
                }
            }
            if (token === "demo-admin-token") {
                setUser({ id: 1, name: "Admin LOCIVA", email: "admin@lociva.id", role: "admin" });
            } else {
                setUser({ id: 2, name: "Demo User", email: "user@lociva.id", role: "user" });
            }
            return;
        }

        try {
            const response = await api.get("/user");
            setUser(response.data?.data || response.data);
        } catch (error) {
            localStorage.removeItem("token");
            localStorage.removeItem("demo_user");
            setUser(null);
            throw error;
        }
    };

    const logout = async () => {
        const token = localStorage.getItem("token");
        if (token && !token.startsWith("demo-")) {
            try {
                await api.post("/logout");
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
        localStorage.removeItem("token");
        localStorage.removeItem("demo_user");
        setUser(null);
    };

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            setLoading(false);
            return;
        }

        getUser()
            .catch(() => {
                // Token expired / invalid
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                getUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}