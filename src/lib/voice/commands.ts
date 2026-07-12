export type VoiceCommandAction =
  | "help"
  | "stop"
  | "read"
  | "switch-ask"
  | "switch-plan"
  | "send";

export type ParsedVoice =
  | { kind: "command"; action: VoiceCommandAction }
  | { kind: "dictation"; text: string };

/** Strip punctuation and collapse whitespace for phrase matching. */
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COMMANDS: Array<{ action: VoiceCommandAction; phrases: string[] }> = [
  { action: "help", phrases: ["help", "what can i say", "voice help"] },
  { action: "stop", phrases: ["stop", "cancel", "stop speaking", "be quiet"] },
  {
    action: "read",
    phrases: ["read", "read answer", "read the answer", "read aloud", "speak"],
  },
  {
    action: "switch-plan",
    phrases: ["switch to plan", "plan mode", "go to plan"],
  },
  {
    action: "switch-ask",
    phrases: ["switch to ask", "ask mode", "go to ask"],
  },
  {
    action: "send",
    phrases: ["send", "submit", "go", "ask that", "send it"],
  },
];

/**
 * Parse a transcript into a spoken meta-command or free-form dictation.
 * Exact phrase match (after normalize) only — partial/leading dictation is dictation.
 */
export function parseVoiceCommand(transcript: string): ParsedVoice {
  const text = transcript.trim();
  if (!text) return { kind: "dictation", text: "" };

  const normalized = normalize(text);
  for (const { action, phrases } of COMMANDS) {
    if (phrases.includes(normalized)) {
      return { kind: "command", action };
    }
  }

  return { kind: "dictation", text };
}
