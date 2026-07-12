/**
 * Spoken + visible help copy for voice controls.
 * Keep this the single source of truth for "what you can say".
 */
export const VOICE_HELP_TEXT = [
  "VoxAssist voice help.",
  "Hold or tap the mic to dictate a question or plan idea.",
  "You can also say: help; stop; read answer; switch to ask; switch to plan; or send.",
  "After dictating, say send to submit, or press Enter.",
  "Use Read on the answer to hear it aloud.",
].join(" ");

/**
 * Short overview for the quick-help (?) control beside the mic.
 * Spoken when the popover opens; also shown as a brief bullet list.
 */
export const VOICE_QUICK_HELP_TEXT = [
  "Tap the mic to dictate. In push-to-talk, tap again when done; with auto-detect, pause to finish.",
  "Say help for full voice commands, send to submit, stop to cancel, or read answer to hear the reply.",
  "Use the gear for auto-send, auto-detect end of speech, and auto-read answers. Use the speaker to read your draft.",
].join(" ");

/** Bullet lines for the quick-help popover UI. */
export const VOICE_QUICK_HELP_BULLETS = [
  "Tap the mic to dictate a question or plan idea.",
  "Push-to-talk: tap again when done. Auto-detect: pause to finish.",
  "Say help, send, stop, or read answer for voice commands.",
  "Gear: auto-send, end-of-speech detect, auto-read answers.",
  "Speaker button reads your current draft aloud.",
] as const;
