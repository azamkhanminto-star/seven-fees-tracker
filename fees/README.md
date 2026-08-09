# Seven Fees Tracker

A fee and cash-flow modeller for a coaching institute. It tracks money **in**
(fee collection), money **out** (refunds, withdrawals), **expenses**, what is
**remaining** (cash in hand and pending student dues), and the **total
collection per day**.

It is a single-page app with no server and no build step — open `index.html`
and it works. All data is kept in the browser's `localStorage` on the device
you use it on.

## Running it

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Serving over `http(s)` also registers the service worker, so the app keeps
working offline and can be installed to a phone home screen ("Add to Home
Screen").

First time in, go to **Settings → Load sample data** to see the app populated,
then **Erase all data** when you are ready to enter real numbers.

## What each tab does

| Tab | Purpose |
|---|---|
| **Dashboard** | Today's collection, totals for a chosen date range, cash in hand, pending dues, a daily money-flow chart and an expense split. |
| **Fee In** | Record a fee collection against a student, with receipt number, period, and payment mode. Printable receipt per entry. |
| **Out & Expense** | Record institute expenses (rent, salary, electricity…) and money out (refunds, owner withdrawal). |
| **Students** | Add students with their agreed course fee. The table shows fee, paid, and due per student. |
| **Daily Report** | Day-by-day ledger: entries, in, out, expense, net of the day, and a running cash balance. Filter by month, export or print. |
| **Settings** | Institute name, currency, opening balance, expense categories, backup/restore, reset. |

## How the numbers are calculated

- **Collection today** — sum of all *fee in* entries dated today.
- **Total collection (In)** — sum of *fee in* entries inside the selected date range.
- **Money out** — refunds and withdrawals in the range.
- **Expenses** — institute costs in the range.
- **Remaining in hand** (tile value) — `In − Out − Expense` for the selected
  range. The line under it shows the all-time cash position, which is
  `opening balance + all In − all Out − all Expense`.
- **Pending fee (dues)** — for each active student with a course fee set:
  `max(0, course fee − amount paid)`, summed. Students with no course fee
  recorded are treated as having no due.
- **Running balance** in the daily report starts from the opening balance in
  Settings and accumulates each day's net, so it reflects the true cash
  position on that date — including days outside the month you are viewing.

## Data, backup, and safety

Data lives only in the browser profile that entered it. It is not synced
anywhere, so:

- Take a **backup** (Settings → Download backup) regularly; it is a JSON file
  that can be restored on any device.
- Clearing browser site data, or using a private window, will lose entries.
- Each device keeps its own separate copy.

CSV exports are available for collections, expenses, students, and the daily
report, so figures can be handed to an accountant or opened in a spreadsheet.

## Files

```
index.html              markup for all six views
assets/styles.css       theme tokens, layout, light + dark
assets/app.js           storage, calculations, rendering, chart
sw.js                   offline cache
manifest.webmanifest    installable-app metadata
```

No dependencies, no framework, no network calls.
