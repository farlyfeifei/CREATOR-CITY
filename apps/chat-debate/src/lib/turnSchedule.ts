import { roundtableTurns, type DiscussionThreadId } from "@/roundtable_core/demoScript";
import type { Agent, RoundtablePhase } from "@/types";

export interface ScheduledTurn {
  index: number;
  agent: Agent;
  target: Agent | null;
  phase: RoundtablePhase;
  thread: DiscussionThreadId;
}

export const ORIGINAL_TURN_COUNT = roundtableTurns.length;

export function buildOriginalTurnSchedule(agents: Agent[]): ScheduledTurn[] {
  if (agents.length < 2 || agents.length > 6) {
    throw new Error("请选择 2–6 位 Agent。");
  }
  const openingTurns = agents.length;
  const closingStartsAt = ORIGINAL_TURN_COUNT - agents.length;

  return roundtableTurns.map((turn, index) => {
    const speakerIndex = index % agents.length;
    const agent = agents[speakerIndex];
    const phase: RoundtablePhase = index < openingTurns
      ? "stance"
      : index >= closingStartsAt
        ? "closing"
        : "rebuttal";
    let target: Agent | null = null;

    if (phase === "rebuttal") {
      const rebuttalRound = Math.floor((index - openingTurns) / agents.length);
      const targetOffset = 1 + (rebuttalRound % (agents.length - 1));
      target = agents[(speakerIndex + targetOffset) % agents.length] ?? null;
    }

    return {
      index,
      agent,
      target,
      phase,
      thread: turn.thread,
    };
  });
}
