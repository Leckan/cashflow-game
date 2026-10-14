"use client";

import { avatarColor } from "@/features/game/avatars";
import { board } from "@/features/game/content/board";
import { boardPoint } from "@/features/game/random";
import type { GameState } from "@/features/game/types";

export function Board2D({ state }: { state: GameState }) {
  const active = state.players[state.activePlayerIndex];
  return (
    <div data-testid="board-flat" className="relative mx-auto aspect-square w-full max-w-[640px] bg-[#17344c]">
      <div className="absolute inset-[18%] border border-brass/50 bg-[#10243a]">
        <p className="display absolute inset-0 flex items-center justify-center px-6 text-center text-2xl text-brass">Independence Spire</p>
      </div>
      {board.map((space) => {
        const point = boardPoint(space.position, 42);
        const occupied = state.players.some((player) => player.boardPosition === space.position);
        return (
          <button
            key={space.id}
            type="button"
            className="absolute flex h-10 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-ink/20 text-[10px] leading-tight text-ink"
            style={{ left: `${50 + point.x}%`, top: `${50 + point.z}%`, background: space.accent }}
            title={space.summary}
          >
            <span className="sr-only">{space.category}. </span>
            {space.name}
            {occupied && active && (
              <span className="absolute -top-2 h-3 w-3 rounded-full" style={{ background: avatarColor(active.avatarId) }} aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
