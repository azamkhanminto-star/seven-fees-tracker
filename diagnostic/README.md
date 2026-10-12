# SEVEN Root Diagnostic System

For SEVEN Career Institute, Medical Road, Aligarh. A teacher uploads a student's paper and answer sheet. Claude finds the root cause of each mistake, and the system produces the full pack in SEVEN's teal-and-white design:

| Document | For | What's in it |
|---|---|---|
| Conceptual Mistakes Report | Teacher / parent | Scores, strength map, one page per mistake with evidence, what is fixed, what to teach first |
| Remedial Teacher Pack | Teacher (confidential) | Root-cause tracing class by class, shared roots, confirmation paper key and interpretation guide, level map, checkpoint answers, final-test key and baseline, question-by-question appendix |
| Student Workbook | Student | 24-day plan and levelled lessons with practice and checkpoints (Hindi key words, no class numbers) |
| Concept Check · Final Test · Diagnostic re-test | Student | Printable papers without answers or class levels |
| Parent Summary | Parent | One page in English and Hindi |

Design decisions and the cost estimate are in [`DESIGN.md`](DESIGN.md).

---

## How a diagnosis works

1. **Add the student** and record the parent's consent. Uploads are blocked until consent exists.
2. **Start a diagnosis** and upload the question paper plus either the scanned answer sheet or a marks sheet (Excel/CSV). The answer key is optional; Claude drafts one if missing.
3. The pipeline runs by itself in about 3–8 minutes. You can close the page while it works:
   reading → analysis → root-cause tracing → confirmation paper → workbook → plan, final test and parent summary.
4. **Review and edit** any wording, then **Approve**. Until then every PDF is marked DRAFT.
5. Give the student the **Concept Check**, then tick ✔ / ½ / ✘ for each question. The system works out the break points and which workbook levels to skip.
6. **Share** with parents by WhatsApp or email. They get a private link that expires after 30 days and shows only approved documents.
7. Upload another paper to the same diagnosis (for example a re-test) and the report shows which mistakes recur and which are fixed, as in the reference pack.

## Setup (one-time, about an hour)

You need three accounts in the institute's name: **Supabase** (database and file storage), **Vercel** (website hosting) and **Anthropic** (the Claude API).

1. **Supabase**: create a project in the **Mumbai (ap-south-1)** region. Open *SQL Editor*, paste the whole of `supabase/migrations/0001_init.sql` and click *Run*. Under *Authentication → Providers*, keep Email on and turn **off** "Allow new users to sign up" (teachers are invited instead).
2. **Anthropic**: at console.anthropic.com create an API key and set a monthly spend limit.
3. **Vercel**: import this GitHub repository, set **Root Directory** to `diagnostic`, choose the **Pro** plan (needed for the long Claude steps), and add every variable from `.env.example`.
4. **First login**: in Supabase *Authentication → Users*, click *Add user*, enter your email and a password, then sign in to the site. The first user automatically becomes **Admin**.
5. As admin: create **batches** and invite **teachers** (*Teachers & batches*), and check **Settings** (models, address).

Run locally (developers):

```bash
cd diagnostic
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
npm test                     # unit tests
CHROME_PATH=/path/to/chrome npm run render:sample   # sample PDFs → samples/output/
```

## Privacy (DPDP)

- Parental consent is recorded, with its notice version and evidence, before any upload. Withdrawal is recorded too.
- **Claude never receives the name, school, roll number or guardian details.** It sees a code (`S-1042`), class, board, pronoun and the answers. A unit test checks this.
- Data stays in Supabase Mumbai and is encrypted at rest. Guardian phone and email are additionally encrypted by the app (AES-256-GCM).
- Row-level security in the database means a teacher can only see students in their own batches. Every view, edit, export, share and deletion is written to the audit log.
- Deletion requests are erased in one click by the admin. Scans are deleted automatically N months after approval (Settings).
- Have the consent wording (`src/lib/ui.ts`) checked by a lawyer before launch.

## Where things live

| Path | What |
|---|---|
| `src/lib/ai/` | Claude client (streaming, prompt caching, refusal fallback, cost), prompts, JSON schemas |
| `src/lib/concepts/` | NCERT Maths concept map, Classes 5–10, with chapter numbers for each book edition |
| `src/lib/pipeline.ts` | The step-by-step diagnostic pipeline |
| `src/lib/scoring.ts` | All arithmetic (scores, baseline, confirmation-paper interpretation). No AI maths. |
| `src/docs/` | The printed documents (teal-and-white theme, fonts, logos) |
| `src/app/` | Screens for teachers and admin |
| `supabase/migrations/` | Database tables and access rules |
| `samples/student-a.ts` | The reference pack, de-identified, used to preview layouts and in tests |

## Phase 1 limits (by design)

- Mathematics only. Physics, Chemistry and Biology come in Phase 2.
- One student at a time. Bulk Excel upload, progress charts, batch insights and a parent login come in Phase 3.
- Ganita Prakash chapter titles (new Class 6–8 books) are marked "to verify" in the concept map until a teacher checks them.
