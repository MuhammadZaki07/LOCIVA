import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "@/context/AuthContext";

import "./index.css";
import { ToastProvider } from "./components/ui/Toast";
import TopLoader from "./components/ui/Toploader";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ToastProvider position="top-right">
    <AuthProvider>
      <TopLoader />
      <App />
    </AuthProvider>
  </ToastProvider>,
);
