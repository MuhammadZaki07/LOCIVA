
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/context/apiClient";
import echo from "@/lib/echo";

export interface RecentReport {
    id: string;
    title: string;
    status: string;
    created_at: string;
}

interface AdminNotificationsContextValue {
    notifications: RecentReport[];
    dismissNotification: (id: string) => Promise<boolean>;
}

const AdminNotificationsContext =
    createContext<AdminNotificationsContextValue | null>(null);

export function AdminNotificationsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<RecentReport[]>([]);

    useEffect(() => {
        if (!user || user.role !== "admin") {
            setNotifications([]);
            return;
        }

        let cancelled = false;

        api
            .get("/reports", {
                params: {
                    per_page: 8,
                    status: "reported",
                },
            })
            .then((res) => {
                if (cancelled) return;

                const raw = res.data?.data?.data ?? res.data?.data ?? [];

                setNotifications(
                    (raw as any[])
                        .filter((report: any) => !report.is_dismissed)
                        .slice(0, 6)
                        .map((report: any) => ({
                            id: String(report.id),
                            title: report.title,
                            status: report.status,
                            created_at: report.created_at,
                        })),
                );
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error("Gagal memuat notifikasi:", error);
                }
            });

        const channel = echo.private("admin.reports");

        channel.listen(".report.created", (event: RecentReport) => {
            if (cancelled) return;

            setNotifications((current) => {
                const id = String(event.id);

                if (current.some((item) => item.id === id)) {
                    return current;
                }

                return [
                    {
                        id,
                        title: event.title,
                        status: event.status,
                        created_at: event.created_at,
                    },
                    ...current,
                ].slice(0, 6);
            });
        });

        return () => {
            cancelled = true;
            echo.leave("admin.reports");
        };
    }, [user?.id, user?.role]);

    const dismissNotification = async (id: string) => {
        try {
            await api.patch(`/reports/${id}/dismiss`);

            setNotifications((current) =>
                current.filter((item) => item.id !== id),
            );

            return true;
        } catch (error) {
            console.error("Gagal menyembunyikan notifikasi:", error);
            return false;
        }
    };

    return (
        <AdminNotificationsContext.Provider
            value={{ notifications, dismissNotification }}
        >
            {children}
        </AdminNotificationsContext.Provider>
    );
}

export function useAdminNotifications() {
    const context = useContext(AdminNotificationsContext);

    if (!context) {
        throw new Error(
            "useAdminNotifications harus digunakan di dalam AdminNotificationsProvider",
        );
    }

    return context;
}
