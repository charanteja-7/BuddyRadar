"use client";

import { useMemo, useState } from "react";

import { AVATARS, COLORS } from "@/lib/constants";

type JoinCardProps = {
  onJoin: (payload: { displayName: string; avatar: string; color: string }) => void;
};

export function JoinCard({ onJoin }: JoinCardProps) {
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  const canJoin = useMemo(
    () => displayName.trim().length >= 2 && selectedAvatar !== null,
    [displayName, selectedAvatar],
  );

  return (
    <section className="join-card" aria-label="Join BuddyLocation">
      <div className="join-card__header">
        <h1>BuddyLocation</h1>
        <p>Drop a pin. Find your crew. In real time.</p>
      </div>

      <label className="join-card__label" htmlFor="displayName">
        Your Name
      </label>
      <input
        id="displayName"
        className="join-card__input"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        maxLength={30}
        placeholder="What do your friends call you?"
      />

      <p className="join-card__label">Choose Avatar</p>
      <div className="join-card__avatars" role="listbox" aria-label="Avatar selection">
        {AVATARS.map((avatar, index) => (
          <button
            type="button"
            className={`join-card__avatar ${selectedAvatar === index ? "is-selected" : ""}`}
            style={{ borderColor: COLORS[index] }}
            aria-pressed={selectedAvatar === index}
            key={avatar}
            onClick={() => setSelectedAvatar(index)}
          >
            {avatar}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="join-card__button"
        disabled={!canJoin}
        onClick={() => {
          if (selectedAvatar === null) {
            return;
          }

          onJoin({
            displayName: displayName.trim(),
            avatar: AVATARS[selectedAvatar],
            color: COLORS[selectedAvatar],
          });
        }}
      >
        Join the Map
      </button>
    </section>
  );
}
