# SEVEN Root Diagnostic System — Design (for approval)

SEVEN Career Institute, Medical Road, Aligarh
Status: **proposal, awaiting owner approval. No code yet.**

---

## 0. Tech stack (plain-language)

| Piece | Choice | Why, in plain words |
|---|---|---|
| Website + server | **Next.js (TypeScript)** hosted on **Vercel** | One project holds both the screens and the secure server code. Vercel deploys automatically on every push, so there are no servers to look after. |
| Database, login, file storage | **Supabase** (managed PostgreSQL), **Mumbai region** | One service covers the database, user logins (admin, teacher, parent), private file storage for scans, and row-level security ("a teacher only sees their own batches"). Data is encrypted at rest and stays in India. |
| AI engine | **Anthropic Messages API** via the official `@anthropic-ai/sdk`, called **only from the server** | The API key lives in Vercel environment variables and never reaches the browser. |
| PDF export | Report page rendered by **headless Chromium** on the server | The PDF matches the on-screen report exactly, and Hindi (Devanagari) text renders correctly. Many lighter PDF libraries garble Hindi conjunct letters. |
| Email | **Resend** (free tier covers this volume) | Sends the "your child's report is ready" email with a secure link. |
| WhatsApp | `wa.me` share links | Free, no WhatsApp Business API approval needed. The message carries a private, expiring link, never the PDF or any marks. |

Expected running cost besides the AI: Vercel Pro about $20/month and Supabase Pro about $25/month, roughly ₹4,000/month together. (The free tiers are not meant for commercial use or for data about minors.)

Code location: a new `diagnostic/` folder in this repo, deployed as its own Vercel project. A separate repository also works; it's the owner's choice.

---

## 1. How a report is produced (pipeline)

```
Upload ─► [A] Read answer sheet (vision) ─► Teacher quick-check of transcription (optional)
                                               │
        Marks/scores computed by CODE ◄────────┘   (no AI arithmetic)
                                               │
       [B] Analysis  ─► [C] Confirmation paper ─► [D] Remedial plan + Parent summary (EN/HI)
                                               │
                    Teacher review / edit / approve ─► PDF ─► Share (WhatsApp / email)
```

* **Step A, Read.** This step runs only for scanned PDFs or photos. Claude reads the handwriting question by question and returns the student's answer and working, marks awarded if the teacher marked the sheet, and an `illegible` flag. For Excel/CSV marks sheets, code parses the file and makes no AI call.
* **Scores are calculated by code**, not by Claude: totals, percentages, section-wise and topic-wise scores. This rules out AI arithmetic slips in the score table.
* **Steps B, C and D are separate API calls**, each with its own JSON schema, so no response gets cut off. Each later step receives the output of the earlier ones.
* **Structured outputs** (`output_config.format` with a JSON Schema) guarantee valid JSON. The report screen and the PDF are rendered from that JSON; raw text is never shown.
* **Prompt caching.** The system prompt holds the fixed rules plus that subject's NCERT/UP Board concept map (Classes 5–10). It is marked `cache_control` with a 1-hour lifetime, so every report after the first in an hour pays about 10% for that block.
* **Model routing** (admin can change both models in Settings):
  * Routine: **`claude-sonnet-5-5`**
  * Difficult: **`claude-opus-5-5`**. This model is used when (a) the teacher ticks "difficult case", (b) more than 25% of answers are illegible, (c) Step B reports low confidence on the break point, or (d) the teacher clicks "Re-analyse with deep model".
* **Refusal fallback** is turned on (`fallbacks: "default"`), so an over-cautious safety refusal is retried automatically instead of failing.
* **Every call is logged** with step, model, input, output, cache-read and cache-write tokens, cost, time taken, stop reason and errors.

**Long jobs.** Each step runs as a server background task and its status is saved in the database. The teacher sees "Reading… → Analysing… → Writing paper…" and can close the tab while it runs.

---

## 2. Database design (Supabase / PostgreSQL)

Every table has `id uuid`, `created_at` and `updated_at`. Row-level security rules: Admin sees all. A Teacher sees students in the batches assigned to them. A Parent sees only approved reports of their linked child.

### People & access
| Table | Key columns |
|---|---|
| `profiles` | `user_id` (Supabase auth), `role` (`admin`/`teacher`/`parent`), `full_name`, `phone_enc`, `active` |
| `batches` | `name`, `class` (8/9/10), `board` (`CBSE`/`UP`), `academic_year`, `subjects[]` |
| `teacher_batches` | `teacher_id`, `batch_id`, `subject` |
| `students` | `full_name`, `class`, `board`, `school`, `roll_no`, `batch_id`, `pseudonym` (e.g. `S-1042`, the only identifier sent to the AI), `guardian_name`, `guardian_phone_enc`, `guardian_email_enc`, `status` (`active`/`deleted`) |
| `parent_links` | `parent_user_id`, `student_id` |

### Consent & compliance (DPDP)
| Table | Key columns |
|---|---|
| `consents` | `student_id`, `guardian_name`, `relation`, `method` (signed form upload / email OTP / in-person), `notice_version`, `purposes[]`, `evidence_file`, `given_at`, `withdrawn_at` |
| `deletion_requests` | `student_id`, `requested_by`, `reason`, `status`, `completed_at` |
| `audit_log` | `actor_id`, `action` (view/edit/export/share/delete), `entity`, `entity_id`, `at`, `ip` |

### Tests & answers
| Table | Key columns |
|---|---|
| `tests` | `subject`, `class`, `board`, `title`, `test_date`, `total_marks`, `paper_file`, `paper_text`, `answer_key_source` (`uploaded`/`ai_generated`/`none`), `answer_key_file` |
| `test_questions` | `test_id`, `q_no` ("Q7b"), `section`, `text`, `max_marks`, `chapter_ref`, `concept_ids[]`, `answer_key` |
| `attempts` | `test_id`, `student_id`, `source` (`scan`/`marksheet`/`bulk`), `files[]`, `status` (`uploaded`→`reading`→`transcript_review`→`analysing`→`needs_review`→`approved`→`shared`, or `failed`), `difficult` (bool) |
| `responses` | `attempt_id`, `question_id`, `transcription`, `marks_awarded`, `outcome` (`right`/`wrong`/`partial`/`not_attempted`), `error_types[]`, `concept_ids[]`. Filled from the report so that batch insights and progress charts are simple queries. |

### Reports & AI
| Table | Key columns |
|---|---|
| `reports` | `attempt_id`, `version`, `schema_version`, `report_json` (jsonb), `status` (`draft`/`approved`/`withdrawn`), `edited_by_teacher` (bool), `approved_by`, `approved_at`, `pdf_file` |
| `report_versions` | full JSON snapshot per edit, for the audit trail and undo |
| `ai_runs` | `attempt_id`, `step` (`read`/`analyse`/`paper`/`plan`), `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `cost_usd`, `duration_ms`, `stop_reason`, `error` |
| `shares` | `report_id`, `channel` (`whatsapp`/`email`), `recipient_enc`, `token`, `expires_at`, `first_viewed_at` |

### Reference data
| Table | Key columns |
|---|---|
| `concepts` | `id` (e.g. `MATH.8.ALG.IDENTITIES`), `subject`, `class`, `board`, `textbook_edition`, `chapter_no`, `chapter_name`, `concept`, `prerequisite_ids[]` |
| `settings` | `routine_model`, `difficult_model`, per-model prices, escalation thresholds, branding |

**On textbook editions.** NCERT has replaced the Class 6–8 books (*Ganita Prakash*, *Curiosity*), and chapter numbers changed. A Class 10 student in 2026 studied the *old* Class 8 book. Each concept therefore stores its edition, and the lineage trace cites the edition the student actually studied.

---

## 3. Report JSON schema

Three schemas, one per step; the final report merges them. Every finding carries **evidence** (which questions, what was seen) and a **confidence** level. A `data_gaps` list says where the evidence is too thin to be sure.

```jsonc
// ───────── Shared pieces ─────────
Evidence    = { "question": "Q7b", "observation": "wrote (a+b)² = a²+b²" }
ConceptRef  = { "concept_id": "MATH.8.ALG.IDENTITIES", "class": 8,
                "chapter": "Ch 9 Algebraic Expressions and Identities", "edition": "NCERT 2023" }
Confidence  = "high" | "medium" | "low"
ErrorType   = "conceptual" | "procedural" | "calculation" | "prerequisite_gap" | "comprehension"
            | "careless" | "not_attempted"
            // Physics
            | "formula_selection" | "unit_conversion" | "numerical_setup"
            // Chemistry
            | "equation_balancing" | "formula_writing" | "valency" | "terminology"
            // Biology
            | "diagram_labelling" | "process_sequencing"

// ───────── Step B: analysis ─────────
{
  "schema_version": "1.0",
  "meta": { "student_ref": "S-1042", "class": 10, "board": "CBSE", "subject": "Mathematics",
            "test_title": "...", "test_date": "2026-10-01", "answer_key_source": "uploaded" },

  "score_summary": {                         // numbers filled by CODE, Claude adds remarks only
    "total": 38, "max": 80, "percent": 47.5,
    "by_section": [ { "section": "A", "scored": 12, "max": 20 } ],
    "by_topic":   [ { "chapter": "Quadratic Equations", "scored": 3, "max": 12 } ],
    "remark": "..."
  },

  "questions": [ {
    "q_no": "Q7b", "max_marks": 4, "marks": 1,
    "outcome": "partial",                    // right | wrong | partial | not_attempted
    "student_work_summary": "...",
    "what_went_wrong": "Expanded (x+3)² as x²+9, so the discriminant came out wrong",
    "error_types": ["prerequisite_gap", "conceptual"],
    "concepts": [ConceptRef],
    "confidence": "high"
  } ],

  "strength_map": [ { "chapter": "...", "level": "strong" | "average" | "weak",
                      "evidence": [Evidence] } ],

  "root_cause_traces": [ {
    "weak_area": "Quadratic equations",
    "chain": [                               // current class → backwards
      { "concept": ConceptRef, "status": "weak" | "shaky" | "secure" | "untested",
        "evidence": [Evidence] }
    ],
    "confidence": "medium"
  } ],

  "break_point": { "class": 8, "concept": ConceptRef,
                   "explanation": "...", "evidence": [Evidence], "confidence": "medium" },

  "common_roots": [ { "root": ConceptRef, "affects": ["Quadratics", "Algebraic fractions"],
                      "explanation": "...", "evidence": [Evidence] } ],

  "genuine_strengths": [ { "statement": "...", "evidence": [Evidence] } ],

  "nature_of_problem": { "primary": "understanding" | "practice" | "carelessness" | "confidence",
                         "secondary": "...", "explanation": "...", "evidence": [Evidence] },

  "data_gaps": [ "Only one question tested coordinate geometry; cannot judge reliably." ],
  "escalate_recommended": false
}

// ───────── Step C: confirmation paper ─────────
{
  "papers": [ {
    "weak_area": "Quadratic equations",
    "questions": [                           // ordered lowest class → current class
      { "seq": 1, "class_level": 7, "concept": ConceptRef, "question": "...",
        "marks": 1, "answer": "...", "what_it_confirms": "..." }
    ]
  } ],
  "instructions_for_teacher": "...",
  "time_minutes": 40
}
// Teacher's copy shows class_level + answers; student's copy hides both (rendering choice).

// ───────── Step D: remedial plan + parent summary ─────────
{
  "priorities": [ { "rank": 1, "concept": ConceptRef, "why_first": "..." } ],
  "weekly_plan": [ { "week": 1, "focus": "...", "activities": ["..."],
                     "practice": "...", "checkpoint": "..." } ],
  "teacher_notes": "...",
  "parent_summary": {
    "en": { "headline": "...", "strengths": "...", "working_on": "...", "how_to_help": "..." },
    "hi": { "headline": "...", "strengths": "...", "working_on": "...", "how_to_help": "..." }
  }
}
```

Once the reference sheet (Aariz Khan, Maths) arrives, field names and section order will be adjusted so the rendered report follows that sheet section by section.

---

## 4. Screens

**Everyone**
1. Login (email + password or OTP)

**Teacher**
2. Dashboard: students list with report status chips; filters for class, subject, batch, status
3. Student profile: details, consent status, diagnostic history
4. Add / edit student, including **guardian consent capture** (upload signed form or send an email OTP). Upload is blocked until consent exists.
5. New diagnostic wizard: ① choose student and test → ② question paper (PDF or typed) → ③ answer sheet (scan/photos) **or** marks sheet → ④ answer key (upload or "let Claude draft it") → ⑤ "difficult case?" toggle → Generate
6. Transcription check: side-by-side view of the scan and Claude's reading, with fixes for misreads (optional, recommended)
7. Processing status: live step progress, with retry on failure
8. **Report review & edit**: every section editable, plus *Approve*, *Re-analyse with deep model*, *Regenerate this section*
9. Report view / print: branded layout, teacher's or student's copy of the confirmation paper
10. Share dialog: WhatsApp link, email, link expiry

**Admin**
11. Admin dashboard: reports this month, AI spend, pending reviews
12. Teachers & users: invite, assign batches, deactivate
13. Batches & classes
14. Settings: routine and difficult models, prices, escalation rules, branding (logo, address)
15. AI usage & cost log: per report, per step, monthly total
16. Concept map browser: view and correct NCERT/UP Board concept maps
17. Data requests: deletion requests and consent withdrawals, plus audit log

**Phase 3**
18. Bulk upload: Excel template download, upload, row validation, queue
19. Progress tracking: one student's results over time (score trend, concepts fixed or still weak)
20. Batch insights: most common weak concepts and shared roots across a batch, with suggested group remedial classes
21. Parent portal: read-only list of approved reports for their child, in English/Hindi

---

## 5. Privacy & DPDP measures

* **Verifiable parental consent before any upload.** Students are minors, so the consent notice lists its purpose, the AI processing (Anthropic, outside India), how long data is kept, and how to withdraw consent. The signed record and its evidence are stored in `consents`.
* **Data minimisation towards the API.** Claude receives the pseudonym (`S-1042`), class, board, subject and the answers. It never receives the name, phone number, address, school or guardian details; those are added only when the PDF is rendered. Teachers are shown a tip to crop or cover the name on a scan before upload.
* **Anthropic API data** is not used for training by default. Zero-data-retention can be requested from Anthropic if needed.
* **Encryption.** The database and storage are encrypted at rest by Supabase. Guardian phone and email are additionally encrypted at field level (AES-GCM, key held in environment variables). Scan files sit in private buckets and are reachable only through short-lived signed URLs.
* **Role-based access** is enforced in the database itself (row-level security), not just in the screens.
* **Right to erasure.** One admin action deletes a student's scans, reports, PDFs and responses, and keeps only an anonymous audit line plus anonymised cost logs.
* **Retention.** Scans are auto-deleted N months after the report is approved (admin setting, default 12 months).
* **Audit log** records every view, edit, export, share and delete.
* Have a lawyer check the consent notice text against the DPDP Rules before going live.

---

## 6. Monthly API cost estimate (about 200 students)

Prices per million tokens: Sonnet 5.5 is $2 in and $10 out; Opus 5.5 is $4 in and $20 out. Cache reads cost $0.20 on both.

**Assumed size of one Maths report** with a scanned answer sheet (paper of about 4 pages, answer sheet of about 10 pages):

| Step | Fresh input | Cached input | Output (incl. thinking) |
|---|---|---|---|
| A Read scans | ~38K | — | ~6K |
| B Analysis | ~15K | ~15K (concept map) | ~12K |
| C Confirmation paper | ~10K | ~15K | ~7K |
| D Plan + EN/HI summary | ~8K | ~15K | ~8K |
| **Total** | **~71K** | **~45K** | **~33K** |

| Per report | Sonnet 5.5 | Opus 5.5 |
|---|---|---|
| Approx. cost | **≈ $0.48** | **≈ $0.95** |

Assumed mix: 80% Sonnet and 20% Opus, plus 20% extra for re-runs. That gives **about $0.70 per report (≈ ₹60)**.

| Scenario | Reports / month | API cost / month |
|---|---|---|
| Phase 1: Maths, each student once a month | 200 | **≈ $140 (≈ ₹12,000)** |
| All 4 subjects, each once a month | 800 | ≈ $560 (≈ ₹48,000) |
| All 4 subjects, once per term (≈ every 3 months) | ≈ 270 avg | ≈ $190 (≈ ₹16,000) |
| Marks-sheet upload instead of scans (Step A skipped) | — | about 35% cheaper |
| Phase 3 bulk uploads via Batch API (half price, results within hours) | — | about 50% cheaper on those |

These are planning estimates. The real cost per report will appear in the usage log from the first week of Phase 1, and the table will be corrected from those numbers.

---

## 7. Phases

* **Phase 1 (MVP): Mathematics only.** Single-student upload, Steps A–D, teacher review/approve, branded PDF, usage log, consent capture, admin settings.
* **Phase 2: Physics, Chemistry, Biology** concept maps, subject-specific error types and report wording.
* **Phase 3:** bulk Excel upload (Batch API), dashboard filters, progress tracking, batch insights, parent portal, WhatsApp/email sharing at scale.
