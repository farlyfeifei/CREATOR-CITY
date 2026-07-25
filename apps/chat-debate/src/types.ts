export type Stance = "support" | "oppose" | "swing";
export type RoundtablePhase = "stance" | "rebuttal" | "closing";
export type AgentKind = "roundtable" | "personal";

export interface ProfileEvidence {
  id: string;
  kind: string;
  claim: string;
  sourceRef: string;
  confidence: "user_confirmed" | "unverified_demo" | "fictional_unverified" | "declared_in_sample";
  visibility: "public" | "public_demo" | "matching_only" | "forbidden";
}

export interface PersonalAgentPortrait {
  identity: {
    preferredName: string;
    privateIdentity: string;
  };
  timeline: string[];
  achievements: string[];
  abilities: {
    confirmed: string[];
    evidence: string[];
    commonRequests: string[];
    falseStrengths: string[];
    learning: string[];
    retired: string[];
  };
  values: {
    principles: string[];
    efficiencyFairness: string;
    gainRisk: string;
    freedomStability: string;
    firstDecisionFactor: string;
    changeEvidence: string[];
    nonNegotiables: string[];
  };
  interaction: {
    familiarDescription: string;
    groupRole: string;
    discussionApproach: string;
    challengedReaction: string;
    disagreementStyle: string;
    admiredOpponents: string;
    angerTriggers: string[];
    humorPacePhrases: string;
  };
  stories: {
    proud: string;
    failure: string;
    valueChangingEvent: string;
    minorityChoice: string;
    unresolvedConflict: string;
    impact: string;
  };
  interests: {
    longTerm: string[];
    recentConcerns: string[];
    endlessTopics: string[];
    temporary: string[];
    booksPeopleTheories: string;
  };
  current: {
    goals: string[];
    constraints: string[];
    seeking: string[];
    unwantedOpportunities: string[];
    availableCapacity: string;
    expiringInfo: string[];
  };
  matching: {
    desiredPeople: string[];
    resonancePeople: string[];
    complementaryPeople: string[];
    unacceptableTraits: string[];
    firstChatJudgment: string;
    commonalityVsComplement: string;
  };
  expression: {
    samples: string[];
    commonWords: string[];
    forbiddenExpressions: string[];
    agentSharpness: string;
  };
  permissionNotes: {
    behaviorPermissions: string;
  };
}

export interface PersonalAgentProfile {
  schemaVersion: 1;
  id: string;
  source: {
    id: string;
    kind: "questionnaire" | "user_supplied_fictional_sample";
    label: string;
    verification: string;
    createdAt: string;
  };
  disclaimer: {
    fictionalSample: boolean;
    aiProxy: true;
    notRealPerson: boolean;
    shortLabel: string;
    details: string;
  };
  identity: {
    displayName: string;
    aliases: string[];
    headline: string;
    role: string;
    domain: string[];
    locationGranularity: string;
  };
  runtime: {
    role: string;
    category: "Personal Agent";
    skillSourcePath: string;
    coreBelief: string;
    attentionPriorities: string[];
    thinkingPattern: string[];
    speechStyle: string;
    debateStyle: string;
    agreementTriggers: string[];
    disagreementTriggers: string[];
    catchphrases: string[];
    responseRequirements: string[];
    groundingPolicy: string;
    safetyNotes: string;
  };
  evidence: ProfileEvidence[];
  portrait?: PersonalAgentPortrait;
  experiences: Array<{
    id: string;
    period: string;
    summary: string;
    evidenceRefs: string[];
  }>;
  projects?: Array<{
    id: string;
    summary: string;
    evidenceRefs: string[];
  }>;
  currentContext: {
    status: string[];
    goals: string[];
    constraints: string[];
    seeking: string[];
    expiresAfter: string;
    evidenceRefs: string[];
  };
  authorization: {
    public: string[];
    matchingOnly: string[];
    forbidden: string[];
    mayAnswer: string[];
    mayHypothesizeOnly: string[];
    mustEscalate: string[];
    mayRefuse: boolean;
    mayCriticize: boolean;
    mustAdmitUnknown: boolean;
  };
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  kind: AgentKind;
  coreBelief: string;
  speechStyle: string;
  debateStyle: string;
  accent: string;
  avatarPrefix?: string;
  profile?: PersonalAgentProfile;
}

export interface ChatMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  role: "expert" | "user" | "system";
  text: string;
  shortQuote?: string;
  stance?: Stance;
  phase?: RoundtablePhase;
  scheduledIndex?: number;
  thread?: "overview" | "cashflow" | "time" | "opportunity" | "safety";
  targetName?: string | null;
  disclosure?: string;
  evidenceIds?: string[];
  createdAt: string;
}

export interface AgentRuntimeState {
  stance: Stance;
  argument: string;
}

export interface DiscussionJudgeScore {
  agentId: string;
  agentName: string;
  logicScore: number;
  evidenceScore: number;
  rhetoricScore: number;
  keywordStuffing: number;
  overallScore: number;
  comment: string;
}

export interface DiscussionVerdict {
  conclusion: string;
  consensus: string[];
  disagreements: string[];
  openQuestions: string[];
  winnerAgentId: string;
  winnerAgentName: string;
  winnerReason: string;
  scores: DiscussionJudgeScore[];
  model: string;
}

export interface ProfileDraft {
  displayName: string;
  headline: string;
  role: string;
  domains: string;
  preferredName: string;
  privateIdentity: string;
  experience1: string;
  experience2: string;
  experience3: string;
  project1: string;
  project2: string;
  project3: string;
  strengths: string;
  strengthEvidence: string;
  commonRequests: string;
  falseStrengths: string;
  learningAbilities: string;
  retiredAbilities: string;
  principles: string;
  efficiencyFairness: string;
  gainRisk: string;
  freedomStability: string;
  firstDecisionFactor: string;
  changeEvidence: string;
  nonNegotiables: string;
  familiarDescription: string;
  groupRole: string;
  discussionApproach: string;
  challengedReaction: string;
  disagreementStyle: string;
  admiredOpponents: string;
  angerTriggers: string;
  humorPacePhrases: string;
  proudStory: string;
  failureStory: string;
  valueChangingEvent: string;
  minorityChoice: string;
  unresolvedConflict: string;
  storyImpact: string;
  longTermInterests: string;
  recentConcerns: string;
  endlessTopics: string;
  temporaryInterests: string;
  booksPeopleTheories: string;
  goals: string;
  constraints: string;
  seeking: string;
  unwantedOpportunities: string;
  availableCapacity: string;
  expiringInfo: string;
  desiredPeople: string;
  resonancePeople: string;
  complementaryPeople: string;
  unacceptableTraits: string;
  firstChatJudgment: string;
  commonalityVsComplement: string;
  voiceSamples: string;
  commonWords: string;
  forbiddenExpressions: string;
  agentSharpness: string;
  publicInfo: string;
  matchingOnly: string;
  forbidden: string;
  mayAnswer: string;
  mayHypothesizeOnly: string;
  mustEscalate: string;
  behaviorPermissions: string;
}
