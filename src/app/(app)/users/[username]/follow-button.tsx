"use client";

import { useState } from "react";

export function FollowButton({
  followingId,
  initialIsFollowing,
}: {
  followingId: string;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      if (isFollowing) {
        await fetch(`/api/follow?following_id=${followingId}`, { method: "DELETE" });
        setIsFollowing(false);
      } else {
        await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ following_id: followingId }),
        });
        setIsFollowing(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {loading ? "…" : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
