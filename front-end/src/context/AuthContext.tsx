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
    full_name: string;
    email: string;
    role: "admin" | "user";
}

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterData {
    full_name: string;
    email: string;
    password: string;
    password_confirmation: string;
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

    /**
     * Login
     */
    const login = async (data: LoginData) => {
        const response = await api.post("/auth/login", data);
        const token = response.data?.data?.token;

        if (!token) {
            throw new Error("Authentication token was not provided.");
        }

        localStorage.setItem("token", token);
        await getUser();
    };

    /**
     * Register
     */
    const register = async (data: RegisterData) => {
        const response = await api.post("/auth/register", data);
        const token = response.data?.data?.token;

        if (!token) {
            throw new Error("Authentication token was not provided.");
        }

        localStorage.setItem("token", token);
        await getUser();
    };

    /**
     * Get authenticated user
     */
    const getUser = async () => {
        try {
            const response = await api.get("/auth/user");
            const userData = response?.data?.data;

            if (!userData) {
                throw new Error("User data was not provided.");
            }

            setUser(userData);
        } catch (error) {
            localStorage.removeItem("token");
            setUser(null);

            throw error;
        }
    };

    /**
     * Logout
     */
    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("token");
            setUser(null);
        }
    };

    /**
     * Check authentication when the application starts
     */
    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            setLoading(false);
            return;
        }

        getUser()
            .catch(() => {
                // 
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