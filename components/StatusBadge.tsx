import type { Availability } from "@/lib/data";

export function StatusBadge({
  status,
  children,
}: {
  status: Availability;
  children: React.ReactNode;
}) {
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
