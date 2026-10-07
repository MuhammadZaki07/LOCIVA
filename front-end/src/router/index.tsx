import { createBrowserRouter, Navigate } from "react-router-dom";
import LandingPage from "@/pages";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import UserDashboard from "@/pages/dashboard/UserDashboard";
import GuestRoute from "@/components/guard/GuestRoute";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import RoleRoute from "@/components/guard/RoleRoute";
import AdminLayout from "@/layouts/AdminLayout";
import MainLayout from "@/layouts/MainLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },

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

  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default router;