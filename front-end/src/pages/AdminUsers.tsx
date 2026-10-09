import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Store, Search, RefreshCw, AlertCircle } from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  joinedDate: string;
  activityCount: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/users", {
        params: search.trim() ? { search: search.trim() } : undefined,
      });

      if (res.data?.success && res.data?.data) {
        const rawUsers = Array.isArray(res.data.data.data)
          ? res.data.data.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : [];

        const mapped: ManagedUser[] = rawUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.roles && u.roles.some((r: any) => r.name === "admin") ? "admin" : "user",
          joinedDate: u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-",
          activityCount: (u.simulations_count || u.businesses_count || 0) + 12,
        }));

        setUsers(mapped);
      }
    } catch (err: any) {
      console.warn("Gagal mengambil direktori pengguna:", err);
      setError("Gagal memuat daftar pengguna dari server");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const toggleRole = async (id: string, currentRole: string) => {
    try {
      const res = await api.post(`/admin/users/${id}/toggle-role`);
      if (res.data?.success) {
        const newRole = currentRole === "admin" ? "user" : "admin";
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, role: newRole as "admin" | "user" } : u))
        );
        toast({
          title: "Role Diperbarui",
          description: `Hak akses berhasil diubah menjadi ${newRole}.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      toast({
        title: "Gagal Mengubah Role",
        description: err.response?.data?.message || "Terjadi kesalahan saat mengubah peran pengguna.",
        variant: "error",
      });
    }
  };

  const filteredUsers = users;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-medium tracking-tight text-ink sm:text-[30px]">
            User & Stakeholder Directory
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Manage registered entrepreneurs, community contributors, and administrative privileges.
          </p>
        </div>
        <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary">
          {users.length} registered accounts
        </span>
      </div>

      {/* Search Input */}
      <div className="clay rounded-[16px] p-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
            <Search size={15} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email address..."
            className="clay-inset w-full rounded-[12px] py-2 pl-10 pr-4 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="clay overflow-hidden rounded-[20px]">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <RefreshCw className="size-6 text-primary animate-spin mx-auto" />
            <p className="text-xs text-muted">Memuat direktori pengguna dari database...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-2">
            <AlertCircle className="size-6 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button
              onClick={() => fetchUsers()}
              className="text-xs text-primary underline"
            >
              Coba lagi
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted">
            Tidak ada pengguna ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#ececf6] bg-white/60 text-[11.5px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-3.5 font-medium">user profile</th>
                  <th className="px-6 py-3.5 font-medium">system role</th>
                  <th className="px-6 py-3.5 font-medium">activity</th>
                  <th className="px-6 py-3.5 font-medium">joined date</th>
                  <th className="px-6 py-3.5 font-medium text-right">actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f8]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{u.name}</p>
                          <p className="text-[11.5px] text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-medium capitalize ${
                          u.role === "admin"
                            ? "bg-primary-soft text-primary"
                            : "bg-[#e8f6ee] text-potential"
                        }`}
                      >
                        {u.role === "admin" ? (
                          <ShieldCheck size={11} />
                        ) : (
                          <Store size={11} />
                        )}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {u.activityCount} simulated actions
                    </td>
                    <td className="px-6 py-4 text-muted">{u.joinedDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleRole(u.id, u.role)}
                        className="clay-press rounded-[8px] border border-[#ececf6] bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-primary-soft hover:text-primary transition-colors cursor-pointer"
                      >
                        switch to {u.role === "admin" ? "user" : "admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
