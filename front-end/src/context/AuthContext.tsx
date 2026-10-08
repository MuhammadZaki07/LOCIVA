import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "./apiClient";
import { useToast } from "@/components/ui/Toast";

export interface User {
  id: string;
  name: string;
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
  login: (data: LoginData) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  getUser: () => Promise<User>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const login = async (data: LoginData): Promise<User> => {
    const response = await api.post("/auth/login", data);
    const token = response.data?.data?.token;

    if (!token) {
      throw new Error("Authentication token was not provided.");
    }

    localStorage.setItem("token", token);

    return await getUser();
  };

  const register = async (data: RegisterData): Promise<User> => {
    const response = await api.post("/auth/register", data);
    const token = response.data?.data?.token;

    if (!token) {
      throw new Error("Authentication token was not provided.");
    }

    localStorage.setItem("token", token);

    return await getUser();
  };

  const getUser = async (): Promise<User> => {
    try {
      const response = await api.get("/auth/user");
      const userData = response?.data?.data;

      if (!userData) {
        throw new Error("User data was not provided.");
      }

      setUser(userData);

      return userData;
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);

      throw error;
    }
  };

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
  const loginWithGoogle = () => {
    sessionStorage.setItem("google_login", "true");

    window.location.href = `${import.meta.env.VITE_APP_BACK_END}/auth/google`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    getUser()
      .then((userData) => {
        const googleLogin = sessionStorage.getItem("google_login");

        if (googleLogin === "true") {
          toast({
            title: `Welcome, ${userData.name}`,
            description: "You have successfully signed in with Google.",
            variant: "success",
          });

          sessionStorage.removeItem("google_login");
        }
      })
      .catch(() => {})
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
        loginWithGoogle,
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
