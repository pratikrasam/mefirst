import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NBHWC_SCOPE = `You are an AI wellness coach following the NBHWC (National Board for Health & Wellness Coaching) Scope of Practice.

CORE ROLE:
- Engage individuals in evidence-based, client-centered processes that facilitate and empower clients to develop and achieve self-determined health and wellness goals.
- Assist clients to use their own insight, personal strengths, and resources to set goals, commit to action steps, and establish accountability.
- Your role is accountability partner, not director, in navigating behavioral change.
- Support clients to achieve self-directed goals consistent with their vision for health and wellbeing.
- You do NOT diagnose, interpret medical data, prescribe, recommend supplements, provide nutrition consultation or meal plans, provide exercise prescription, or provide psychological therapeutic interventions or treatment.
- When appropriate, you may offer evidence-based resources or information from nationally recognized authorities.

MOTIVATIONAL INTERVIEWING (MI) — Use OARS technique naturally in every conversation:
- Open-ended questions: Ask questions that invite reflection ("What matters most to you about this?", "How would that change things for you?")
- Affirmations: Recognize the client's strengths, efforts, and past successes ("It sounds like you showed real commitment there", "That took courage")
- Reflections: Mirror back what the client shares to deepen understanding — use simple reflections ("So you're feeling...") and complex reflections ("It seems like part of you wants X while another part feels Y")
- Summaries: Periodically collect what the client has shared and reflect it back ("Let me see if I've got this right...")
- Elicit change talk: Help the client articulate their own reasons for change rather than telling them what to do
- Roll with resistance: If a client pushes back, explore rather than confront ("That's an interesting perspective — tell me more about that")

CHECK-IN BEHAVIOR:
- Begin conversations by warmly checking in: "How have things been since we last talked?"
- Ask about previously discussed action items or "homework": "Last time you mentioned you'd try X — how did that go?"
- If the client completed their action item, celebrate the win enthusiastically and explore what made it work
- If the client didn't complete it, explore barriers with genuine curiosity (not judgment): "What got in the way?", "What would need to change to make that easier?"
- After exploring barriers, help problem-solve collaboratively: "What's one small adjustment that could help?"
- End conversations with a clear, mutually agreed-upon action step for next time

BARRIER HANDLING & PROBLEM SOLVING:
- When a client reports being stuck or struggling, normalize the experience first
- Use the "importance and confidence" rulers: "On a scale of 1-10, how important is this to you?" and "How confident are you that you can do it?"
- If importance is low, explore values and connect the goal to what matters most
- If confidence is low, scale down the goal to build momentum: "What would a 'just right' step look like?"
- Identify specific barriers (time, energy, environment, social, emotional) and brainstorm solutions
- Suggest the "if-then" planning technique: "If [barrier], then I will [alternative action]"

PROGRESS & REFLECTION:
- Help clients notice progress, even small shifts: "Looking back to where you started, what do you notice?"
- Connect progress back to the client's deeper values and motivations
- Encourage journaling or self-reflection between sessions
- When a client shares a win, help them anchor the success: "What does this tell you about yourself?"

SESSION PREPARATION:
- If a client mentions an upcoming coaching session, help them prepare: "What would you most like to focus on in your session?", "What updates would be helpful for your coach to know?"
- Help the client articulate what they want to get out of the session

TONE:
- Always maintain a warm, supportive, and non-judgmental tone
- Use the client's name sparingly and naturally
- Keep responses focused and concise (2-4 paragraphs max) — avoid long lectures
- Mirror the client's energy level — if they're excited, match it; if they're down, be gentle`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface PatientContext {
  highLevelGoal?: string | null;
  motivation?: string | null;
  coachStyle?: string | null;
  valuesWheel?: Record<string, number> | null;
  upcomingSession?: { date: string; coachName: string } | null;
}

function buildPatientContextPrompt(context: PatientContext): string {
  const parts: string[] = [];

  if (context.highLevelGoal) {
    parts.push(`CLIENT'S PRIMARY GOAL: ${context.highLevelGoal}`);
  }
  if (context.motivation) {
    parts.push(`WHAT MOTIVATES THEM: ${context.motivation}`);
  }
  if (context.coachStyle) {
    parts.push(`PREFERRED COACHING STYLE: ${context.coachStyle}`);
  }

  if (context.valuesWheel && Object.keys(context.valuesWheel).length > 0) {
    const labels: Record<string, string> = {
      health: "Health & Well Being",
      career: "Career",
      money: "Money",
      personalGrowth: "Personal Growth",
      funRecreation: "Fun & Recreation",
      physicalEnvironment: "Physical Environment",
      romance: "Significant Other",
      family: "Family",
      friends: "Friends",
    };
    const wheelSummary = Object.entries(context.valuesWheel)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => a[1] - b[1])
      .map(([k, v]) => `${labels[k] || k}: ${v}/10`)
      .join(", ");
    const lowest = Object.entries(context.valuesWheel)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([k]) => labels[k] || k);
    const highest = Object.entries(context.valuesWheel)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => labels[k] || k);

    parts.push(`VALUES WHEEL (self-rated life satisfaction): ${wheelSummary}`);
    if (lowest.length > 0) {
      parts.push(`Areas they rated lowest (potential growth areas): ${lowest.join(", ")}`);
    }
    if (highest.length > 0) {
      parts.push(`Areas they rated highest (strengths to leverage): ${highest.join(", ")}`);
    }
    parts.push(`Use the values wheel to personalize your coaching — reference specific life areas when relevant, and connect goals to their values.`);
  }

  if (context.upcomingSession) {
    const sessionDate = new Date(context.upcomingSession.date);
    const now = new Date();
    const hoursUntil = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil > 0 && hoursUntil <= 48) {
      parts.push(`UPCOMING SESSION: The client has a coaching session with ${context.upcomingSession.coachName} in ${Math.round(hoursUntil)} hours. Gently remind them and help them prepare — ask what they'd like to focus on and what updates they have for their coach.`);
    } else if (hoursUntil > 0 && hoursUntil <= 168) {
      parts.push(`UPCOMING SESSION: The client has a coaching session with ${context.upcomingSession.coachName} on ${sessionDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}. Keep this in mind as a reference point.`);
    }
  }

  if (parts.length === 0) return "";
  return `\n\nCLIENT CONTEXT (use this to personalize your responses):\n${parts.join("\n")}`;
}

export async function getAssistantResponse(
  systemPrompt: string,
  conversationHistory: ChatMessage[],
  userMessage: string,
  patientContext?: PatientContext
): Promise<string> {
  const contextPrompt = patientContext ? buildPatientContextPrompt(patientContext) : "";
  const messages: ChatMessage[] = [
    { role: "system", content: `${NBHWC_SCOPE}\n\n${systemPrompt}${contextPrompt}` },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 800,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "I'm here to support you. Could you tell me more about what's on your mind?";
}

export async function generateConversationSummary(
  messages: ChatMessage[]
): Promise<string> {
  const userMessages = messages.filter(m => m.role === "user").map(m => m.content);
  if (userMessages.length === 0) return "No conversation yet.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Summarize this wellness coaching conversation in 2-3 sentences for a coach reviewing their patient's progress. Focus on the patient's concerns, goals discussed, any action items or breakthroughs, barriers encountered, and motivational state. Note any MI techniques that were effective. Be concise and professional.",
      },
      {
        role: "user",
        content: `Conversation messages from the patient:\n${userMessages.join("\n---\n")}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || "Conversation summary unavailable.";
}

export interface CoachInsights {
  keyTopics: string[];
  emotionalTone: string;
  concerns: string[];
  wins: string[];
  actionItems: string[];
  suggestedTalkingPoints: string[];
  overallProgress: string;
}

export async function generateCoachInsights(
  messages: ChatMessage[],
  patientGoal: string | null,
  assistantName: string | null
): Promise<CoachInsights> {
  const conversationText = messages
    .map(m => `${m.role === "user" ? "Patient" : "AI Coach"}: ${m.content}`)
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert coaching supervisor helping a human wellness coach prepare for their next 1:1 session with a patient.

Analyze the conversation between the patient and their AI wellness assistant${assistantName ? ` (${assistantName})` : ""} and produce structured insights.

${patientGoal ? `The patient's primary wellness goal is: "${patientGoal}"` : ""}

Return ONLY valid JSON with this exact structure:
{
  "keyTopics": ["topic1", "topic2"],
  "emotionalTone": "brief description of the patient's emotional state throughout the conversation",
  "concerns": ["concern or challenge the patient mentioned"],
  "wins": ["any positive progress, breakthroughs, or small victories the patient mentioned"],
  "actionItems": ["commitments or next steps the patient discussed"],
  "suggestedTalkingPoints": ["specific things the coach should bring up in the next session"],
  "overallProgress": "1-2 sentence assessment of where the patient is on their wellness journey"
}

Keep each item concise (1 short sentence max). Include 2-5 items per array. If there's not enough information for a category, use an empty array. Focus on actionable insights that help the coach have a productive session.`,
      },
      {
        role: "user",
        content: conversationText,
      },
    ],
    max_tokens: 600,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      keyTopics: [],
      emotionalTone: "Unable to assess",
      concerns: [],
      wins: [],
      actionItems: [],
      suggestedTalkingPoints: [],
      overallProgress: "Insufficient conversation data for assessment.",
    };
  }

  try {
    return JSON.parse(content) as CoachInsights;
  } catch {
    return {
      keyTopics: [],
      emotionalTone: "Unable to parse",
      concerns: [],
      wins: [],
      actionItems: [],
      suggestedTalkingPoints: [],
      overallProgress: content.slice(0, 200),
    };
  }
}

export interface CoachingSessionAnalysis {
  dateAndName: string;
  clientCommitmentFromPreviousSession: string;
  clientAgendaForThisSession: string;
  connectAndReview: string;
  toolsAndTechniques: string;
  opportunities: string;
  challenges: string;
  accountability: string;
  support: string;
  clientCommitmentForNextSession: string;
  reviewEvaluation: string;
  generalProgressNotes: string;
  valuesWheelSuggestions: Record<string, number> | null;
}

export async function summarizeSessionNotes(
  rawNotes: string,
  context?: {
    patientName?: string;
    sessionDate?: string;
    previousNotesSummary?: string;
    currentValuesWheel?: Record<string, number>;
  }
): Promise<CoachingSessionAnalysis> {
  const valuesWheelContext = context?.currentValuesWheel
    ? `\nCurrent Values Wheel ratings (1-10): ${Object.entries(context.currentValuesWheel)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}`
    : "";

  const previousContext = context?.previousNotesSummary
    ? `\nPrevious session summary: ${context.previousNotesSummary}`
    : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional wellness coaching assistant following NBHWC standards. Analyze the coach's raw session notes and produce a structured coaching session report.

Patient: ${context?.patientName || "Unknown"}
Session Date: ${context?.sessionDate || "Unknown"}${previousContext}${valuesWheelContext}

Return ONLY valid JSON with this exact structure:
{
  "dateAndName": "Session date and client name",
  "clientCommitmentFromPreviousSession": "What the client committed to doing from the last session. If unknown, say 'First session or not specified'",
  "clientAgendaForThisSession": "What the client wanted to focus on in this session",
  "connectAndReview": "How the session started, rapport building, and review of progress since last session",
  "toolsAndTechniques": "Coaching tools, techniques, and approaches used during the session (e.g., motivational interviewing, visualization, goal setting frameworks)",
  "opportunities": "Growth opportunities and positive possibilities identified during the session",
  "challenges": "Barriers, obstacles, and challenges the client is facing",
  "accountability": "How accountability was established — what will be tracked and how",
  "support": "Support structures discussed — who/what can help the client succeed",
  "clientCommitmentForNextSession": "Specific commitments the client made for before the next session",
  "reviewEvaluation": "Key points from the session, what worked well, what could be improved",
  "generalProgressNotes": "Overall assessment of client progress, notable changes, trajectory",
  "valuesWheelSuggestions": ${context?.currentValuesWheel ? "Suggested updated ratings (1-10) for the 9 values wheel categories based on what was discussed. Only include categories where you have evidence from the session to suggest a change. Categories: health, career, money, personalGrowth, funRecreation, physicalEnvironment, romance, family, friends. Return as object or null if insufficient evidence." : "null"}
}

Be thorough but concise. Draw inferences from the notes where the coach may have been brief. For valuesWheelSuggestions, only adjust ratings where the session discussion provides clear evidence of improvement or decline.`,
      },
      {
        role: "user",
        content: rawNotes,
      },
    ],
    max_tokens: 1200,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  const fallback: CoachingSessionAnalysis = {
    dateAndName: context?.sessionDate && context?.patientName ? `${context.sessionDate} — ${context.patientName}` : "Unknown",
    clientCommitmentFromPreviousSession: "Not specified",
    clientAgendaForThisSession: "Not specified",
    connectAndReview: "Not specified",
    toolsAndTechniques: "Not specified",
    opportunities: "Not specified",
    challenges: "Not specified",
    accountability: "Not specified",
    support: "Not specified",
    clientCommitmentForNextSession: "Not specified",
    reviewEvaluation: "Not specified",
    generalProgressNotes: "Not specified",
    valuesWheelSuggestions: null,
  };

  if (!content) return fallback;
  try {
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}
