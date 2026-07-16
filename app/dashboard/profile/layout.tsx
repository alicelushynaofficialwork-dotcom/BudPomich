import "./profile-editor.css";
import { requireMasterRole } from "@/lib/auth-server";

export default async function ProfileEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireMasterRole();
  return children;
}
