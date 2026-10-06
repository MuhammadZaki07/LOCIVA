import { useState } from "react";
import { ShieldCheck, Store, Search } from "lucide-react";

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  joinedDate: string;
  activityCount: number;
  status: "active" | "pending";
}

const initialUsers: ManagedUser[] = [
  {
    id: 1,
    name: "Admin LOCIVA",
    email: "admin@lociva.id",
    role: "admin",
    joinedDate: "Jan 12, 2026",
    activityCount: 84,
    status: "active",
  },
  {
    id: 2,
    name: "Muhammad Zaki",
    email: "zaki@lociva.id",
    role: "user",
    joinedDate: "Feb 04, 2026",
    activityCount: 29,
    status: "active",
  },
  {
    id: 3,
    name: "Siti Rahmawati",
    email: "siti.rahma@gmail.com",
    role: "user",
    joinedDate: "Mar 18, 2026",
    activityCount: 14,
    status: "active",
  },
  {
    id: 4,
    name: "Budi Santoso",
    email: "budi.urban@stakeholder.org",
    role: "admin",
    joinedDate: "Apr 01, 2026",
    activityCount: 42,
    status: "active",
  },
  {
    id: 5,
    name: "Rian F&B Partner",
    email: "rian.coffee@outlook.com",
    role: "user",
    joinedDate: "Apr 22, 2026",
    activityCount: 9,
    status: "active",
  },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [search, setSearch] = useState("");

  const toggleRole = (id: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, role: u.role === "admin" ? "user" : "admin" } : u
      )
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
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
                      onClick={() => toggleRole(u.id)}
                      className="clay-press rounded-[8px] border border-[#ececf6] bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-primary-soft hover:text-primary transition-colors"
                    >
                      switch to {u.role === "admin" ? "user" : "admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
