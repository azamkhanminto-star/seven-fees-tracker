# SEVEN Root Diagnostic System — Design (for approval)

SEVEN Career Institute, Medical Road, Aligarh
Status: **approved. Phase 1 (Maths) built in this folder; see README.md.**

Owner decisions (October 2026):
* **Design:** teal and white throughout, from the SEVEN logo (`public/brand/`).
* **Every upload gets the full pack:** whenever a teacher uploads a paper with an answer sheet, the system produces the complete Aariz-style results. A second paper in the same diagnosis adds the recurring-vs-fixed comparison.

---

## 0. What the reference pack taught us

The Aariz set (Class X Maths, October 2026) is a **pack of four documents built from two papers**, not a single report:

| # | Document | Pages | Audience | What it contains |
|---|---|---|---|---|
| 1 | **Diagnostic Test** (student paper) | 2 | Student | 64 marks, 3 sections (18×1, 11×2, 8×3), 90 min. Built to re-test what the school half-yearly exam showed. |
| 2 | **Conceptual Mistakes Report** | 9 | Teacher / parent | Cover, contents, overview (both scores, count of recurring mistakes, "Good News"), **one page per recurring mistake** (what he writes ✗ / the correct idea ✓ / evidence from each paper / why it happens / teach this), "Fixed by the Diagnostic" table plus a word of caution, "What to Teach First" (priorities plus a check-in plan) |
| 3 | **Remedial Teacher Pack** (confidential) | 17 | Teacher | **Part A** root-cause tracing: each weak area split into sub-skills, each sub-skill traced class by class to its NCERT chapter, break point highlighted with evidence, shared-roots table, "biggest payoff". **Part B** confirmation paper: tagging sheet (Q → class → concept → chapter), answer key, interpretation guide ("if he fails A4–A5 → break point Class 8 → start at Step 1.2"). **Part C** workbook level map (Level ↔ Class), checkpoint answers, final test key, improvement baseline. |
| 4 | **Student Workbook** | 24 | Student | 24-day plan (45 min/day, 6 days a week), 4 parts × 4 levels. Each level has Understand it (with Hindi key terms), See it in real life, 2 solved examples, 5 practice questions with answers, Watch out, and a 5-question checkpoint (pass mark 4/5). Shows "Level 1–4", never class numbers. |

What this changes in the design:

1. **The analysis compares papers.** A mistake counts as *recurring* only if the same idea broke in both papers. Mistakes from the first paper that didn't come back are listed as *fixed*, with a caution that the improvement may be recent revision. The system therefore takes **one or more papers per student** and tracks findings across them.
2. **The workflow is a cycle.** School exam → findings → *generated* diagnostic test → combined analysis → confirmation paper → (teacher marks it) → workbook levels to skip → workbook → final test → measured improvement.
3. **Each weak area is split into sub-skills**, and each sub-skill has its own lineage chain, with "secure" evidence as well as "weak" evidence.
4. **The output is long.** The pack runs to about 50 pages, so generation is split into more steps, and workbook material is kept in a reusable library (see §1).
5. **Wording rules.** Student copies hide class levels. Pronouns follow the student profile. Every claim cites specific question numbers from specific papers.
6. **Look and feel.** The pack uses dark green with a yellow accent; your brief says Navy `#052A61` with Yellow `#FBB605`; the logo itself uses teal `#0F766E` with yellow, red, green and blue bars. Colours will be one theme setting, set to whichever you confirm. Logos are in `diagnostic/public/brand/` as SVG.
7. All four PDFs were produced by headless Chrome, which is the PDF approach proposed below, so the layouts can be reproduced closely.

> Privacy note: the reference files contain a minor's name, school and roll number, so **they are not committed to this repository**. They will be kept only in private storage, and for testing we will use a de-identified copy ("Student A").

---

## 1. Tech stack (plain-language)

| Piece | Choice | Why, in plain words |
|---|---|---|
| Website + server | **Next.js (TypeScript)** on **Vercel** | One project holds both the screens and the secure server code. It deploys automatically, with no servers to look after. |
| Database, login, files | **Supabase** (PostgreSQL), **Mumbai region** | One service covers the database, logins, private storage for scans, and row-level security. Data is encrypted at rest and stays in India. |
| AI engine | **Anthropic Messages API** (`@anthropic-ai/sdk`), **server only** | The API key lives in server environment variables and never reaches the browser. |
| PDF export | Report pages rendered as HTML and printed by **headless Chromium** | Same method as the reference pack. Hindi renders correctly, and on-screen and PDF output match. |
| Email / WhatsApp | **Resend** for email, `wa.me` links for WhatsApp | Free at this volume. Messages carry a private, expiring link, never marks or the PDF. |

Running cost besides the AI: about **₹4,000/month** (Vercel Pro and Supabase Pro).

### The reusable libraries (big cost and quality win)

Much of the pack is the same for any student with the same gap. Step 1.1 "the distributive law" is identical for every student whose chain breaks there. So the system keeps three teacher-approved libraries:

* **Workbook step library**, keyed by concept: understand-it, real-life example, solved examples, practice, watch-out, checkpoint, answers.
* **Confirmation question bank**, keyed by concept and class level.
* **Concept map**: NCERT/UP Board, Classes 5–10, with textbook edition.

For each student, Claude *selects and orders* library items and writes only the personal parts: evidence, explanations, "why it happens", the plan. A new step is generated only when the library lacks one; a teacher approves it once and it is reused after that. Over time this makes packs cheaper, faster and more consistent.

---

## 2. Workflow and AI pipeline

```
           ┌──────────────────────────── one "Diagnostic Case" per student per subject ────────────────────────────┐
 Paper 1 ─►│ [A] Read scan ─► [B1] Findings (paper 1) ─► [G] Generate diagnostic test (optional) ─► print, student sits it │
 Paper 2 ─►│ [A] Read scan ─► [B2] Cross-paper analysis ─► [C] Root-cause tracing ─► [D] Confirmation paper + guide           │
           │ Teacher marks confirmation paper ─► [E] Break points confirmed ─► [F] Workbook + final test + plan + parent summary│
           │ Teacher review/approve ─► 4 branded PDFs ─► share ─► final test result ─► improvement vs baseline                 │
           └──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Single-paper mode also works: one paper → B → C → D → F. The report then says that recurrence couldn't be checked.

| Step | What Claude does | Input | Output (JSON) |
|---|---|---|---|
| A Read | Reads handwriting question by question; flags illegible answers | Scans (PDF/images), question paper | `transcript` |
| *code* | Marks, totals, section/topic scores | Transcript, key, marks sheet | `scores` |
| B Analyse | Per-question outcome, error types, mistakes; across papers: recurring vs fixed | Transcripts, scores, concept map (cached) | `analysis` |
| C Trace | Weak areas → sub-skills → lineage chains → break point → shared roots → biggest payoff | `analysis`, concept map (cached) | `tracing` |
| D Confirm | Confirmation paper climbing from the lowest class, tagging sheet, key, interpretation rules | `tracing`, question bank | `confirmation` |
| E Interpret | Applies the rules to the teacher's ✔/✘/½ marks; confirms break points and levels to skip | Marks entered by the teacher | `confirmed_breaks` (mostly code) |
| F1 Workbook | Picks and orders library steps, writes missing steps, 24-day plan | `confirmed_breaks`, step library | `workbook` (one call per weak area) |
| F2 Close | Final test mirroring the original wrong questions, baseline, priorities, parent summary EN/HI | Everything above | `plan` |
| G Diagnostic | Builds a re-test from paper-1 findings | `analysis` of paper 1 | `diagnostic_test` |

**API practices** (as in v1):

* **Structured outputs:** every step returns JSON against a fixed schema, and the documents are rendered from that JSON.
* **Prompt caching:** the system prompt holds the rules and that subject's concept map, with a 1-hour cache.
* **Model routing**, both models changeable in Settings: `claude-sonnet-5-5` for routine cases, `claude-opus-5-5` for difficult ones. The difficult model is used when the teacher flags the case, when more than 25% of answers are illegible, when the analysis reports low confidence on a break point, or on "Re-analyse with deep model".
* **Refusal fallback** is turned on.
* **Every call is logged** with tokens and cost.
* **Step F1** runs its weak-area calls in parallel.
* **Bulk runs** (Phase 3) use the Batch API at half price.

---

## 3. Database design (Supabase / PostgreSQL)

Every table has `id uuid`, `created_at` and `updated_at`. Row-level security: Admin sees all. A Teacher sees their assigned batches. A Parent sees only approved, shared documents for their linked child.

### People, access, consent
| Table | Key columns |
|---|---|
| `profiles` | `user_id`, `role` (`admin`/`teacher`/`parent`), `full_name`, `phone_enc`, `active` |
| `batches` | `name`, `class`, `board` (`CBSE`/`UP`), `academic_year` |
| `teacher_batches` | `teacher_id`, `batch_id`, `subject` |
| `students` | `full_name`, `class`, `section`, `board`, `school`, `roll_no`, `batch_id`, `pronoun` (`he`/`she`/`they`, used in report wording), `pseudonym` (`S-1042`, the only identity sent to the AI), `guardian_name`, `guardian_phone_enc`, `guardian_email_enc`, `status` |
| `parent_links` | `parent_user_id`, `student_id` |
| `consents` | `student_id`, `guardian_name`, `relation`, `method`, `notice_version`, `purposes[]`, `evidence_file`, `given_at`, `withdrawn_at` |
| `deletion_requests` | `student_id`, `requested_by`, `status`, `completed_at` |
| `audit_log` | `actor_id`, `action`, `entity`, `entity_id`, `at` |

### Papers and answers
| Table | Key columns |
|---|---|
| `papers` | `subject`, `class`, `board`, `title` ("DPS GBN Half-Yearly Set C"), `kind` (`school_exam`/`diagnostic`/`confirmation`/`final_test`/`other`), `total_marks`, `duration_min`, `paper_file`, `generated_from_case_id` (when SEVEN generated it) |
| `paper_questions` | `paper_id`, `q_no` ("Q37(iii)", "A18"), `section`, `text`, `max_marks`, `concept_ids[]`, `class_level` (for confirmation papers), `answer`, `mirrors_question_id` (final test ↔ original) |
| `attempts` | `paper_id`, `student_id`, `case_id`, `source` (`scan`/`marksheet`/`bulk`), `files[]`, `status` |
| `responses` | `attempt_id`, `question_id`, `transcription`, `marks`, `outcome` (`right`/`wrong`/`partial`/`blank`), `error_types[]`, `note`, `illegible` |

### Diagnostic cases and outputs
| Table | Key columns |
|---|---|
| `cases` | `student_id`, `subject`, `opened_by`, `status` (`collecting`→`analysing`→`confirming`→`remediating`→`final_test`→`closed`), `difficult`, `baseline_pct`, `final_pct` |
| `findings` | `case_id`, `kind` (`recurring`/`fixed`/`single_paper`), `title` ("The Missing ± Root"), `fix_type` (`one_lesson`/`weeks_practice`/`pattern_recognition`), `evidence` jsonb, `weak_area_id` |
| `weak_areas` | `case_id`, `title`, `predicted_break_concept_id`, `confirmed_break_concept_id`, `start_step_id` |
| `case_outputs` | `case_id`, `step` (`analysis`/`tracing`/`confirmation`/`workbook`/`plan`/`diagnostic_test`), `version`, `json`, `status` (`draft`/`approved`), `edited`, `approved_by` |
| `documents` | `case_id`, `type` (`mistakes_report`/`teacher_pack`/`workbook`/`diagnostic_paper`/`confirmation_paper_student`/`final_test_student`/`parent_summary`), `version`, `pdf_file` |
| `ai_runs` | `case_id`, `step`, `model`, input/output/cache-read/cache-write tokens, `cost_usd`, `duration_ms`, `stop_reason`, `error` |
| `shares` | `document_id`, `channel`, `recipient_enc`, `token`, `expires_at`, `first_viewed_at` |

### Libraries (reference data)
| Table | Key columns |
|---|---|
| `concepts` | `id` (`MATH.8.CH9.IDENTITIES`), `subject`, `class`, `board`, `edition` ("NCERT 2020–25", "Ganita Prakash"), `chapter_no`, `chapter_name`, `concept`, `prerequisite_ids[]` |
| `workbook_steps` | `concept_ids[]`, `title`, `level_hint`, `content` jsonb (understand / hindi_terms / real_life / examples / practice / watch_out / checkpoint / answers), `status` (`draft`/`approved`), `approved_by`, `times_used` |
| `question_bank` | `concept_id`, `class_level`, `question`, `answer`, `diagnoses` (what a wrong answer means), `status` |
| `settings` | models, prices, escalation thresholds, theme colours, logo, address, plan defaults (24 days, 45 min) |

---

## 4. JSON schemas (one per step)

Shared pieces:

```jsonc
Evidence   = { "paper": "half_yearly" | "diagnostic" | "...", "q": "A18", "marks": "0/1",
               "observation": "agreed sin(A+B) = sin A + sin B; wrote sin 60° = ½" }
ConceptRef = { "id": "MATH.8.CH9.IDENTITIES", "class": 8, "chapter_no": 9,
               "chapter": "Algebraic Expressions & Identities", "edition": "NCERT 2020–25" }
Confidence = "high" | "medium" | "low"
ErrorType  = conceptual | procedural | calculation | prerequisite_gap | comprehension | careless
           | not_attempted | formula_selection | unit_conversion | numerical_setup        // Physics
           | equation_balancing | formula_writing | valency | terminology                 // Chemistry
           | diagram_labelling | process_sequencing                                       // Biology
```

**B: `analysis`** (feeds the Conceptual Mistakes Report)
```jsonc
{
  "papers": [ { "key": "diagnostic", "title": "...", "score": "54½/64", "pct": 85 } ],  // scores from code
  "questions": [ { "paper": "diagnostic", "q": "A9", "outcome": "wrong", "marks": "0/1",
                   "what_went_wrong": "...", "error_types": ["conceptual"], "concepts": [ConceptRef],
                   "confidence": "high" } ],
  "headline": "On standard textbook questions he understands most topics…",
  "recurring_mistakes": [ {
      "title": "The Missing ± Root", "one_line": "Only +√k taken; the negative root is never checked.",
      "student_writes": "x² = 9 ⇒ x = 3", "correct_idea": "x² = 9 ⇒ x = ±3, then check both",
      "evidence": [Evidence],                // at least one per paper
      "why_it_happens": "...", "teach_this": "...",
      "fix_type": "one_lesson" | "weeks_practice" | "pattern_recognition",
      "error_types": [ErrorType], "confidence": "high" } ],
  "fixed_mistakes": [ { "concept": "HCF vs LCM", "before": Evidence, "after": Evidence } ],
  "caution": "Some diagnostic questions were similar to half-yearly ones…",
  "genuine_strengths": [ { "statement": "...", "evidence": [Evidence] } ],
  "nature_of_problem": { "primary": "understanding" | "practice" | "carelessness" | "confidence",
                         "explanation": "...", "evidence": [Evidence] },
  "priorities": [ { "rank": 1, "label": "One Lesson", "title": "Trig & ± Root", "what": "..." } ],
  "check_in_plan": [ { "when": "Week 1", "what": "..." } ],
  "data_gaps": [ "..." ]
}
```

**C: `tracing`** (Teacher Pack Part A)
```jsonc
{
  "edition_note": "Chapters refer to the NCERT books the student studied (2020–2025 editions)…",
  "weak_areas": [ {
      "title": "Brackets and Functions", "fixing": "sin(A ± B) = sin A ± sin B",
      "sub_skills": [ {
          "name": "Knowing which operations open a bracket",
          "chain": [ { "concept": ConceptRef, "note": "(a + b)² ≠ a² + b²", "is_break": true } ]  // Class 10 → down
      } ],
      "break_point": { "concept": ConceptRef, "headline": "Class 8 · Ch 9 … carried into Class 9 p(x)",
                       "weak_evidence": [Evidence], "secure_evidence": [Evidence],
                       "explanation": "...", "confidence": "medium" } } ],
  "shared_roots": [ { "root": "Over-spreading…", "weak_areas": [1, 3], "taught_in": [ConceptRef],
                      "evidence": [Evidence] } ],
  "biggest_payoff": { "concept": ConceptRef, "why": "..." }
}
```

**D: `confirmation`** (Teacher Pack Part B; student copy hides class levels and answers)
```jsonc
{
  "format": { "questions": 43, "sections": 4, "minutes": 90, "how_to_give": "Not for marks…" },
  "sections": [ { "weak_area": "Brackets and Functions",
      "items": [ { "q": "A4", "class_level": 8, "concept": ConceptRef, "concept_tested": "Identity (a + b)²",
                   "question": "Expand (a + b)².", "answer": "a² + 2ab + b²",
                   "source": "bank" | "generated", "bank_id": "..." } ],
      "rules": [ { "if_fails": ["A4", "A5"], "break_point": "Class 8 identities", "start_step": "1.2" } ],
      "prediction": "First errors around A4–A6 (Class 8–9)." } ],
  "whole_section_correct_rule": "The area is secure…"
}
```

**F1: `workbook`** (Student Workbook and Teacher Pack Part C)
```jsonc
{
  "plan": { "days": 24, "minutes_per_day": 45, "day_split": "10 read · 20 practice · 10 checkpoint · 5 correct",
            "weeks": [ { "title": "Shared roots", "days": [ { "day": 1, "step": "2.1", "task": "Negative × negative" } ] } ] },
  "parts": [ { "weak_area": "Brackets and Functions", "fixing": "...",
      "steps": [ { "step": "1.1", "level": 1, "class_band": "Class 6–7",     // class_band: teacher copy only
                   "title": "When Brackets Open: the Distributive Law",
                   "library_id": "...",                                      // or null if newly written
                   "skip": false,                                            // from confirmed break points
                   "content": { "understand": "...", "hindi_terms": [ { "en": "distributive law", "hi": "वितरण नियम" } ],
                                "real_life": "...", "examples": [ { "q": "...", "a": "..." } ],
                                "practice": [ { "q": "...", "a": "..." } ], "watch_out": [ "..." ],
                                "checkpoint": [ { "q": "...", "a": "..." } ], "pass_mark": 4 } } ] } ]
}
```

**F2: `plan`** (final test, improvement, parent summary)
```jsonc
{
  "final_test": { "minutes": 60, "marks": 30,
      "items": [ { "q": "F5", "marks": 2, "question": "...", "solution": "...",
                   "mirrors": { "paper": "diagnostic", "q": "A9" } } ] },
  "baseline": { "matched_marks": "7½/27", "pct": 28, "detail": [Evidence], "target_pct": 70 },
  "parent_summary": {
    "en": { "headline": "...", "strengths": "...", "working_on": "...", "how_to_help": "..." },
    "hi": { "headline": "...", "strengths": "...", "working_on": "...", "how_to_help": "..." } }
}
```

**G: `diagnostic_test`**: sections, each question with `targets_finding` and `concept`, an answer key, and a teacher note saying which paper-1 finding each question re-tests.

---

## 5. Screens

**Everyone:** 1. Login

**Teacher**
2. Dashboard: students and their cases, with stage chips (Collecting · Analysing · Confirming · Remediating · Final test · Closed); filters for class, subject, batch, stage
3. Student profile: details, pronoun, consent, cases and history
4. Add / edit student, including **guardian consent capture**. Uploads are blocked until consent exists.
5. **Case page**, the heart of the app: a timeline of papers and steps, with the next action highlighted
6. Add paper: question paper (PDF or typed) → answer sheet (scans or photos) **or** marks sheet → answer key (upload or "Claude drafts it")
7. Transcription check: scan beside Claude's reading, with fixes for misreads
8. Generate diagnostic test (from paper-1 findings): preview, edit, print
9. Review & edit: Mistakes Report / Teacher Pack / Workbook, each section editable, with *Approve*, *Regenerate section*, *Re-analyse with deep model*
10. **Enter confirmation results**: a ✔ / ✘ / ½ grid per question. Break points and levels to skip are suggested automatically for the teacher to confirm.
11. Enter final-test result: improvement against the baseline
12. Documents & print: the 4 branded PDFs plus student copies, and the Share dialog

**Admin**
13. Admin dashboard: cases this month, AI spend, pending reviews
14. Teachers & users · 15. Batches
16. Settings: models, prices, escalation rules, theme colours, logo, address, plan defaults
17. AI usage & cost log
18. **Libraries**: concept map, workbook steps, question bank (approve, edit, retire)
19. Data requests & audit log

**Phase 3:** 20. Bulk upload · 21. Progress over time · 22. Batch insights (most common recurring mistakes and shared roots, suggested group classes) · 23. Parent portal (EN/HI)

---

## 6. Privacy & DPDP measures

* **Verifiable parental consent before any upload.** The notice states the purpose, AI processing by Anthropic outside India, retention and withdrawal. The evidence is stored.
* **Data minimisation.** Claude receives the pseudonym, class, board, subject, pronoun and answers. It never receives the name, school, roll number, phone or address; these are merged in only when the PDFs are rendered. Teachers get a reminder to cover the name on scans.
* **Encryption.** The database and storage are encrypted at rest. Guardian contacts are also encrypted at field level. Files sit in private buckets reachable only through short-lived signed links.
* **Role-based access** is enforced inside the database (row-level security), plus an **audit log** of every view, edit, export, share and delete.
* **Erasure** of a student's data in one action. Scans are auto-deleted after N months (default 12).
* Anthropic API data is not used for training by default. Zero-data-retention can be requested.
* Have a lawyer review the consent notice against the DPDP Rules before launch.

---

## 7. Monthly API cost estimate (about 200 students), revised

Prices per million tokens: Sonnet 5.5 is $2 in and $10 out; Opus 5.5 is $4 in and $20 out. Cache reads cost $0.20 on both.

**One full case (Maths, two scanned papers, about 30 pages, full pack of about 50 pages):**

| Step | Fresh input | Cached | Output (incl. thinking) |
|---|---|---|---|
| A Read 2 papers | ~80K | — | ~12K |
| B Analyse | ~30K | ~20K | ~14K |
| C Trace | ~20K | ~20K | ~12K |
| D Confirmation | ~20K | ~20K | ~10K |
| F1 Workbook (4 areas) | ~50K | ~40K | ~28K → **~8K once the library is filled** |
| F2 Final test + parent | ~20K | ~20K | ~8K |
| G Diagnostic test (optional) | ~15K | ~20K | ~6K |
| **Total** | **~235K** | **~140K** | **~90K (~70K with library)** |

| Per full case | Sonnet 5.5 | Opus 5.5 |
|---|---|---|
| First months (library empty) | ≈ $1.40 | ≈ $2.80 |
| Library filled | ≈ $1.20 | ≈ $2.40 |

Assumed mix: 80% Sonnet and 20% Opus, plus 20% extra for re-runs. That gives **≈ $1.90 per full case (≈ ₹165) at first, falling to ≈ $1.60 (≈ ₹140)**.

| Scenario | Cases / month | API cost / month |
|---|---|---|
| Maths, every student once per term | ≈ 67 | **≈ $110–130 (≈ ₹10–11K)** |
| Maths, every student once a month | 200 | ≈ $320–380 (≈ ₹28–33K) |
| All 4 subjects, each once per term | ≈ 270 | ≈ $430–510 (≈ ₹37–44K) |
| Marks sheets instead of scans | — | about 30% cheaper |
| Bulk runs via the Batch API | — | about 50% cheaper on those |

These are planning estimates; real numbers will appear in the usage log from week one. The biggest levers are the scan page count and how quickly the workbook library fills.

---

## 8. Phases

* **Phase 1 (MVP): Maths.** Single student, one or two papers, steps A–F, the four branded PDFs plus student copies, teacher review, confirmation-results entry, consent, usage log, libraries (seeded from the Aariz pack after de-identification).
* **Phase 2:** Physics, Chemistry, Biology: concept maps, subject error types, seeded libraries. Optional step G (diagnostic test generator) if it isn't already in Phase 1.
* **Phase 3:** bulk upload (Batch API), progress over time, batch insights, parent portal, sharing at scale.
