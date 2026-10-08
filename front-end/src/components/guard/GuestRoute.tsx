import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LogoPuzzleLoader from "../ui/Logopuzzleloader";

function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
          <LogoPuzzleLoader color="#6363DB" />
        </div>
    );
  }

  if (user) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default GuestRoute;