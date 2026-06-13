"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { masterFollowStorageKey } from "@/lib/availability";

export function FollowMasterButton({
  masterId,
  masterName,
}: {
  masterId: string;
  masterName: string;
}) {
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const loadFollowState = window.setTimeout(() => {
      const followed = JSON.parse(
        localStorage.getItem(masterFollowStorageKey) ?? "[]",
      ) as string[];
      setIsFollowing(followed.includes(masterId));
    }, 0);

    return () => window.clearTimeout(loadFollowState);
  }, [masterId]);

  function toggleFollow() {
    const followed = JSON.parse(
      localStorage.getItem(masterFollowStorageKey) ?? "[]",
    ) as string[];
    const next = isFollowing
      ? followed.filter((id) => id !== masterId)
      : Array.from(new Set([masterId, ...followed]));

    localStorage.setItem(masterFollowStorageKey, JSON.stringify(next));
    setIsFollowing(!isFollowing);
  }

  return (
    <button
      className={isFollowing ? "public-follow-button active" : "public-follow-button"}
      type="button"
      onClick={toggleFollow}
      aria-label={
        isFollowing
          ? `Відписатися від ${masterName}`
          : `Підписатися на ${masterName}`
      }
    >
      {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
      {isFollowing ? "Ви підписані" : "Підписатися"}
    </button>
  );
}
