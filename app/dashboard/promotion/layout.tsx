import "./promotion.css";
import { requireMasterRole } from "@/lib/auth-server";

export default async function PromotionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireMasterRole();
  return children;
}
