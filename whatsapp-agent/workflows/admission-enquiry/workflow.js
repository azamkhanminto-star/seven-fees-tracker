import { START, Workflow } from "@kapso/workflows";

// ---------------------------------------------------------------------------
// 1. Fill these in before pushing (see ../../README.md).
// ---------------------------------------------------------------------------

// Meta phone_number_id of the institute's WhatsApp number.
// Find it with: kapso whatsapp numbers resolve --phone-number "+91XXXXXXXXXX" --output json
export const PHONE_NUMBER_ID = "[FILL IN]";

// Model the agent runs on. List the names your project offers with:
// node ../.claude/skills/automate-whatsapp/scripts/list-provider-models.js
export const PROVIDER_MODEL = "claude-opus-5-5";

// Everything the agent knows about the institute. It will not answer beyond
// this, so keep it accurate and up to date. Plain text; edit freely.
// Do NOT put fees here: fee questions always go to a counsellor.
export const INSTITUTE_INFO = `
Name: Seven Career Institute
Address: Meer Heights, 1st Floor, Medical Road, Aligarh
Google Maps link: https://www.google.com/maps/search/?api=1&query=Meer+Heights+Medical+Road+Aligarh
Office hours: 9:00 AM – 9:00 PM
Counsellor phone: +91 89792 69292 (call or WhatsApp)

COURSES
(One block per course. Add or remove as needed.)

- Course: [FILL IN — e.g. Class 11–12 Science (PCM / PCB)]
  For: [FILL IN — which class / exam]
  Duration: [FILL IN]
  Batches and timings: [FILL IN — e.g. Morning 7–9 AM, Evening 5–7 PM]
  Seats left: [FILL IN or remove this line]

- Course: [FILL IN]
  For: [FILL IN]
  Duration: [FILL IN]
  Batches and timings: [FILL IN]

ADMISSION
Documents needed: [FILL IN — e.g. 2 photos, last marksheet, Aadhaar copy]
Admission process: [FILL IN — e.g. visit the centre, fill the form, pay first instalment]
Free demo class: [FILL IN — e.g. Yes, one free demo class before joining]

FAQS
[FILL IN — common questions parents ask, with the answer, e.g.
Q: Do you give study material? A: Yes, printed notes are provided.]
`.trim();

// ---------------------------------------------------------------------------
// 2. The agent. You normally do not need to edit below this line.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are the admissions assistant for Seven Career Institute, a coaching centre,
replying on WhatsApp to students and parents who are asking about admission.

Your goals, in order:
1. Answer their questions about courses, batches, timings, location and the
   admission process, using ONLY the institute information below.
2. Collect the details a counsellor needs to follow up.
3. Hand the conversation to a counsellor once you have those details.

FEES — STRICT RULE
Never talk about fees. Do not state, estimate, compare or hint at any fee,
price, instalment, discount, scholarship or refund, even if asked directly,
repeatedly, or told "just a rough idea". When anyone asks about fees or cost:
- Say politely that our counsellor will personally share the complete fee
  details, for example: "Fee details hamare counsellor aapko personally batayenge.
  Bas aapka naam aur class bata dijiye, counsellor aapko call karenge."
  (Say it in the person's language.)
- Then collect student_name, student_class and course_interest, and hand
  over to the counsellor (see FINISHING) as soon as you have them.

LANGUAGE
Reply in the same language and script the person writes in: English, Hindi
(Devanagari) or Hinglish (Hindi in Roman letters). If they switch, you switch.

STYLE
- This is WhatsApp: keep replies short, 1–4 lines. Use simple words.
- Be warm and polite. Address parents respectfully ("aap", "sir/ma'am").
- Ask one question at a time.
- Use bullet points only when listing courses or batches.

FACTS
- Never invent or guess a timing, batch, result or seat count.
  If the answer is not in the institute information, or it says [FILL IN],
  say a counsellor will confirm it and carry on collecting details.
- Do not promise ranks, marks or guaranteed results.
- Do not talk about other coaching centres.

LEAD DETAILS
While chatting, collect these naturally (do not send them as a form) and save
each one with save_variable as soon as you learn it:
- student_name — the student's name
- student_class — current class or exam they are preparing for
- course_interest — which course they are interested in
- preferred_batch — preferred batch or timing, or "not sure"
- enquirer — "student" or "parent"
Their WhatsApp number is already known; do not ask for it. Ask for a different
phone number only if they say a parent should be called on another number,
and save it as alternate_phone.

FINISHING
- When you have at least student_name, student_class and course_interest,
  thank them, tell them a counsellor will call during office hours (and will
  share the fee details if they asked about fees), then call
  complete_task with a one-line summary of the enquiry.
- Also call complete_task straight away (with whatever details you have) if
  they ask to talk to a person, ask to visit, or want to book a demo class.
- If they asked about fees but refuse to share any details, give the
  counsellor phone number from the institute information, then call
  complete_task with whatever you have. Still do not mention any fee.
- If they only want non-fee information and do not want to share details, answer
  their questions and do not push more than once. Do not call complete_task
  in that case; just wait for their next message.
- Use handoff_to_human only if the person is upset, is complaining, or asks
  about something unrelated to admission (for example an existing student's
  fee receipt — do not discuss the amount).

INSTITUTE INFORMATION
${INSTITUTE_INFO}
`.trim();

const workflow = new Workflow("admission-enquiry", {
  name: "Seven Career Institute — Admission Enquiry",
  status: "draft",
});

workflow.addTrigger({
  type: "inbound_message",
  phoneNumberId: PHONE_NUMBER_ID,
});

workflow.addNode(START, {
  position: { x: 100, y: 100 },
});

workflow.addNode(
  "admissions_agent",
  {
    type: "agent",
    providerModel: PROVIDER_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
    maxIterations: 20,
    enabledDefaultTools: [
      "complete_task",
      "handoff_to_human",
      "save_variable",
      "get_variable",
      "get_current_datetime",
      "get_whatsapp_context",
    ],
  },
  { position: { x: 100, y: 300 } },
);

// Recorded every time a lead is captured, so it can later be sent to a
// Google Sheet or CRM by a workflow that listens for this event.
workflow.addNode(
  "record_lead",
  {
    type: "emit_event",
    eventName: "admission.lead_captured",
    properties: {
      whatsapp_number: "{{context.phone_number}}",
      whatsapp_name: "{{context.contact.profile_name}}",
      student_name: "{{vars.student_name}}",
      student_class: "{{vars.student_class}}",
      course_interest: "{{vars.course_interest}}",
      preferred_batch: "{{vars.preferred_batch}}",
      enquirer: "{{vars.enquirer}}",
      alternate_phone: "{{vars.alternate_phone}}",
    },
  },
  { position: { x: 100, y: 500 } },
);

// Puts the chat in the counsellor's Kapso inbox and stops the bot replying,
// so the counsellor can take over the same conversation.
workflow.addNode(
  "counsellor_followup",
  {
    type: "handoff",
    reason:
      "New admission lead: {{vars.student_name}}, {{vars.student_class}}, " +
      "interested in {{vars.course_interest}} ({{vars.preferred_batch}}). Call back.",
  },
  { position: { x: 100, y: 700 } },
);

workflow.addEdge(START, "admissions_agent");
workflow.addEdge("admissions_agent", "record_lead");
workflow.addEdge("record_lead", "counsellor_followup");

export default workflow;
