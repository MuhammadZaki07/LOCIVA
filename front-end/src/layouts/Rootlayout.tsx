import { useTopLoading } from "@/components/ui/Toploader";
import { Outlet, useNavigation } from "react-router-dom";

function RouteProgress() {
  const navigation = useNavigation();
  useTopLoading(navigation.state !== "idle");
  return null;
}

export default function RootLayout() {
  return (
    <>
      <RouteProgress />
      <Outlet />
    </>
  );
}