import { createBrowserRouter, Navigate } from "react-router-dom";
import LandingPage from "@/pages";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import UserDashboard from "@/pages/UserDashboard";
import GuestRoute from "@/components/guard/GuestRoute";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import RoleRoute from "@/components/guard/RoleRoute";
import AdminLayout from "@/layouts/AdminLayout";
import MainLayout from "@/layouts/MainLayout";

const router = createBrowserRouter([
  // Public Landing Page
  {
    path: "/",
    element: <LandingPage />,
  },

  // Guest Routes (restricted to unauthenticated visitors)
  {
    element: <GuestRoute />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },

  // Protected User Routes (requires authenticated account)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/dashboard",
            element: <UserDashboard />,
          },
        ],
      },
    ],
  },

  // Protected Admin Routes (requires role="admin")
  {
    element: <RoleRoute allowedRoles={["admin"]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: "/admin",
            element: <AdminDashboard />,
          },
          {
            path: "/admin/users",
            element: <AdminUsers />,
          },
        ],
      },
    ],
  },

  // Fallback redirect
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default router;