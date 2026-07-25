import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/auth";
import type { Agent, AgentRuntimeState, ChatMessage, PersonalAgentProfile } from "@/types";

export async function loadCloudProfiles(): Promise<PersonalAgentProfile[]> {
  const userId = await currentUserId();
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("agent_profiles")
    .select("persona_json")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data
    .map((row) => row.persona_json)
    .filter((value): value is PersonalAgentProfile => Boolean(value && typeof value === "object"));
}

export async function saveCloudProfile(profile: PersonalAgentProfile): Promise<void> {
  const userId = await currentUserId();
  if (!supabase || !userId) return;
  const { error } = await supabase.from("agent_profiles").upsert({
    user_id: userId,
    client_profile_id: profile.id,
    persona_json: profile,
    model: null,
    version: profile.schemaVersion,
    is_active: true,
  }, { onConflict: "user_id,client_profile_id" });
  if (error) console.warn("Failed to save Supabase agent profile", error.message);
}

export async function deleteCloudProfile(profileId: string): Promise<void> {
  const userId = await currentUserId();
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from("agent_profiles")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("client_profile_id", profileId);
  if (error) console.warn("Failed to delete Supabase agent profile", error.message);
}

export async function createCloudDebate(input: {
  topic: string;
  agents: Agent[];
  runtime: Record<string, AgentRuntimeState>;
  messages: ChatMessage[];
}): Promise<string | null> {
  const userId = await currentUserId();
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("debates")
    .insert({
      owner_user_id: userId,
      topic: input.topic,
      status: "active",
      runtime_json: input.runtime,
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    if (error) console.warn("Failed to create Supabase debate", error.message);
    return null;
  }
  await supabase.from("debate_participants").insert(input.agents.map((agent) => ({
    debate_id: data.id,
    agent_profile_id: null,
    builtin_agent_id: agent.kind === "roundtable" ? agent.id : null,
    display_name: agent.name,
    persona_snapshot_json: agent.profile || {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      coreBelief: agent.coreBelief,
      speechStyle: agent.speechStyle,
      debateStyle: agent.debateStyle,
    },
  })));
  await appendCloudMessages(data.id, input.messages, 0);
  return data.id;
}

export async function appendCloudMessages(
  debateId: string | null,
  messages: ChatMessage[],
  startSequence: number,
): Promise<void> {
  if (!supabase || !debateId || !messages.length) return;
  const rows = messages.map((message, index) => ({
    debate_id: debateId,
    speaker_id: message.speakerId,
    speaker_name: message.speakerName,
    role: message.role,
    content: message.text,
    sequence: startSequence + index + 1,
    metadata_json: {
      id: message.id,
      shortQuote: message.shortQuote ?? null,
      stance: message.stance ?? null,
      phase: message.phase ?? null,
      scheduledIndex: message.scheduledIndex ?? null,
      thread: message.thread ?? null,
      targetName: message.targetName ?? null,
      disclosure: message.disclosure ?? null,
      evidenceIds: message.evidenceIds ?? [],
      createdAt: message.createdAt,
    },
  }));
  const { error } = await supabase.from("debate_messages").upsert(rows, {
    onConflict: "debate_id,sequence",
  });
  if (error) console.warn("Failed to append Supabase debate messages", error.message);
}

export async function updateCloudDebateRuntime(
  debateId: string | null,
  runtime: Record<string, AgentRuntimeState>,
): Promise<void> {
  if (!supabase || !debateId) return;
  await supabase
    .from("debates")
    .update({ runtime_json: runtime, updated_at: new Date().toISOString() })
    .eq("id", debateId);
}

export async function recordCloudUsage(input: {
  debateId: string | null;
  action: string;
  provider?: string;
  model?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): Promise<void> {
  const userId = await currentUserId();
  if (!supabase || !userId) return;
  await supabase.from("usage_events").insert({
    user_id: userId,
    debate_id: input.debateId,
    action: input.action,
    provider: input.provider ?? null,
    model: input.model ?? null,
    input_tokens: input.inputTokens ?? null,
    output_tokens: input.outputTokens ?? null,
  });
}

async function currentUserId(): Promise<string | null> {
  if (isGuestMode()) return null;
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
