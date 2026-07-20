import "../dashboard/profile/profile-editor.css";
import "./profile.css";
import "./public-profile-tabs.css";
import "./public-profile-portfolio.css";
import "./public-profile-reviews.css";

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
