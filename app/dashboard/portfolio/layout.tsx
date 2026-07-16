import "./portfolio.css";
import { requireMasterRole } from "@/lib/auth-server";

export default async function PortfolioEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireMasterRole();
  return children;
}
