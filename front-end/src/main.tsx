import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "@/context/AuthContext";

import "./index.css";
import { ToastProvider } from "./components/ui/Toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ToastProvider position="top-right">
    <AuthProvider>
      <App />
    </AuthProvider>
  </ToastProvider>,
);
