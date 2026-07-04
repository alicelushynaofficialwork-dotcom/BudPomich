import "./dashboard.css";
import "../client/dashboard/client-dashboard.css";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
