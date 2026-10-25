# Seven Career Institute — WhatsApp Admission Agent

An AI assistant that answers admission enquiries on the institute's WhatsApp
number, built on [Kapso](https://kapso.ai).

## What it does

1. A student or parent messages the institute on WhatsApp.
2. The agent answers questions about courses, batches, timings, location
   and the admission process. **It never discusses fees:** anyone asking about
   fees is told a counsellor will share them, and their details go to the
   counsellor first. It replies in English, Hindi or Hinglish,
   whichever language the person writes in.
3. While chatting, it collects the student's name, class, course of interest,
   preferred batch, and whether a student or a parent is writing.
4. Once it has the name, class and course (or the person asks for a
   counsellor, a visit or a demo class), it:
   - records an `admission.lead_captured` event with those details, and
   - hands the chat to a counsellor in the Kapso inbox. The bot stops
     replying, so the counsellor carries on in the same conversation.

It answers **only** from the institute information you give it. If something
isn't there, it says a counsellor will confirm, instead of making up a timing.

```
WhatsApp message ─▶ admissions_agent ─▶ record_lead ─▶ counsellor_followup
                    (answers + collects   (lead event)   (handoff to inbox)
                     details)
```

## Files

```
workflows/admission-enquiry/workflow.js   the agent: institute info, prompt, flow
scripts/check.js                          local check, run with `npm run check`
package.json                              pins @kapso/workflows
```

## Setup

### 1. Fill in the institute details

Open `workflows/admission-enquiry/workflow.js` and replace every `[FILL IN]`
in `INSTITUTE_INFO` with real details: each course with its batches and
timings, documents needed, demo class, counsellor phone, and the questions
parents usually ask. **Do not add fees.** Fee questions always go to a
counsellor.

Then run:

```bash
cd whatsapp-agent
npm install
npm run check
```

It lists anything still marked `[FILL IN]`.

### 2. Create a Kapso account and connect WhatsApp

1. Sign up at <https://app.kapso.ai> and create a project.
2. Connect the institute's WhatsApp number to the project (Kapso walks you
   through Meta / WhatsApp Business setup). Use a number that is **not**
   currently logged in to the normal WhatsApp app, or use a new number.
3. Install the CLI and log in:

   ```bash
   npm install -g @kapso/cli
   kapso login
   cd whatsapp-agent
   kapso link --project <your-project-id>
   ```

### 3. Set the phone number and model

- **Phone number ID:**

  ```bash
  kapso whatsapp numbers resolve --phone-number "+91XXXXXXXXXX" --output json
  ```

  Put the `phone_number_id` into `PHONE_NUMBER_ID` in `workflow.js`.

- **Model:** list the models your project offers and put the name into
  `PROVIDER_MODEL`:

  ```bash
  export KAPSO_API_KEY=...   # from the Kapso dashboard
  node ../.claude/skills/automate-whatsapp/scripts/list-provider-models.js
  ```

Run `npm run check` again. It should print **Ready to push**.

### 4. Push and test

```bash
kapso build
kapso push --dry-run
kapso push workflow admission-enquiry
```

The workflow goes up as a **draft**. Message the institute number from your
own phone, try a few questions in English and Hindi, and check that the lead
lands in the Kapso inbox. When you're happy, set it to **active** in the Kapso
dashboard (or change `status: "draft"` to `"active"` in `workflow.js` and
push again).

## Changing things later

- **New batch or new course:** edit `INSTITUTE_INFO`, then
  `kapso push workflow admission-enquiry`.
- **How the agent behaves** (tone, what to collect, when to hand over): edit
  `SYSTEM_PROMPT` in the same file.
- **Sending leads to a Google Sheet or CRM:** create a second workflow with a
  `project_event` trigger on `admission.lead_captured`. Every lead's details
  arrive as the event's properties.

## Good to know

- The bot replies freely only within WhatsApp's 24-hour window after the
  person's last message. That's always true for incoming enquiries. If you
  later want the bot to message people *first* (fee reminders, batch
  announcements), you'll need Meta-approved message templates.
- Once a chat is handed to a counsellor, the bot stays quiet in that chat
  until the counsellor closes the handoff in Kapso.
