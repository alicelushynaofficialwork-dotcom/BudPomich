"use client";

import { useState } from "react";
import { Check, UserPlus } from "lucide-react";

export function FollowButton() {
  const [following, setFollowing] = useState(false);

  return (
    <button
      className={following ? "btn btn-following" : "btn btn-primary"}
      type="button"
      onClick={() => setFollowing((value) => !value)}
    >
      {following ? <Check size={17} /> : <UserPlus size={17} />}
      {following ? "Ви підписані" : "Підписатися"}
    </button>
  );
}
