import type { Agent, Stance } from "@/types";

export function AgentAvatar({
  agent,
  size = 44,
  speaking = false,
  stance,
}: {
  agent: Agent;
  size?: number;
  speaking?: boolean;
  stance?: Stance;
}) {
  const state = speaking ? "Speaking" : stance === "support" ? "Supported" : stance === "oppose" ? "Opposed" : "Idle";
  if (agent.avatarPrefix) {
    return (
      <div className={`agent-avatar ${speaking ? "is-speaking" : ""}`} style={{ width: size, height: size, background: agent.accent }}>
        <img src={`${import.meta.env.BASE_URL}assets/avatars/${agent.avatarPrefix}${state}.png`} alt={agent.name} />
      </div>
    );
  }
  return (
    <div
      className={`agent-avatar agent-avatar--initial ${speaking ? "is-speaking" : ""}`}
      style={{ width: size, height: size, background: agent.accent }}
      aria-label={agent.name}
    >
      {agent.name.slice(0, 1)}
    </div>
  );
}
