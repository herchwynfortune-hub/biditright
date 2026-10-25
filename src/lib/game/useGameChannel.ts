"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RevealResult } from "./types";

export type GameChannelHandlers = {
  onBidLocked?: (payload: { team_id: string; statement_id: string }) => void;
  onRevealed?: (payload: RevealResult) => void;
  onAdvanced?: (payload: { status: string; current_statement_index: number }) => void;
};

export function useGameChannel(gameId: string, handlers: GameChannelHandlers) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`game:${gameId}`)
      .on("broadcast", { event: "bid_locked" }, ({ payload }) => handlersRef.current.onBidLocked?.(payload as never))
      .on("broadcast", { event: "revealed" }, ({ payload }) => handlersRef.current.onRevealed?.(payload as never))
      .on("broadcast", { event: "advanced" }, ({ payload }) => handlersRef.current.onAdvanced?.(payload as never))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);
}
