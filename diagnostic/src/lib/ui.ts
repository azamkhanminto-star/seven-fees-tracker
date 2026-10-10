export const STATUS_LABEL = {
  collecting: "Waiting for papers",
  processing: "Being prepared",
  transcript_review: "Check transcription",
  needs_review: "Ready for your review",
  approved: "Approved",
  failed: "Needs attention",
} as const;

export const CONSENT_NOTICE_VERSION = "2026-10-v1";

export const CONSENT_PURPOSES = [
  "Diagnosing learning gaps from the student's test papers",
  "Processing answer sheets with an AI service (Anthropic, outside India); the student's name and contact details are not sent",
  "Preparing reports, workbooks and test papers for the student, parents and teachers",
] as const;
