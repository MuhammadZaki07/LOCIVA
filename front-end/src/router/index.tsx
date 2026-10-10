import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import LandingPage from "@/pages";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import GuestRoute from "@/components/guard/GuestRoute";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import RoleRoute from "@/components/guard/RoleRoute";
import AdminLayout from "@/layouts/AdminLayout";
import MainLayout from "@/layouts/MainLayout";
import AuthCallback from "@/pages/auth/AuthCallback";
import RootLayout from "@/layouts/Rootlayout";
import { ForgetPassword } from "@/pages/auth/ForgetPassword";
import { ResetPassword } from "@/components/ui/ResetPassword";
import { MapPage } from "@/pages/Maps/MapPage";

const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallback />,
      },
      {
        path:"/view-maps",
        element:<MapPage/>
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
          {
            path: "/forget-password",
            element: <ForgetPassword/>,
          },
          {
            path: "/reset-password",
            element: <ResetPassword/>,
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
                lazy: page(() => import("@/pages/dashboard/UserDashboard")),
              },
              {
                path: "/profile",
                lazy: page(() => import("@/pages/Profile")),
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
                lazy: page(() => import("@/pages/dashboard/AdminDashboard")),
              },
              {
                path: "/admin/users",
                lazy: page(() => import("@/pages/AdminUsers")),
              },
              {
                path: "/admin/profile",
                lazy: page(() => import("@/pages/Profile")),
              },
            ],
          },
        ],
      },

      {
        path: "*",
        element: "404 Not found",
      },
    ],
  },
]);

export default router;
