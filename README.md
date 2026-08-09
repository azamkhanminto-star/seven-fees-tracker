# 3M Detailing — Workshop Management

A complete management system for a car wash and detailing workshop: washing,
service, denting & painting, detailing, rubbing & polishing, interior dry
cleaning, ceramic coating and PPF.

It is a single-page app with **no server and no build step** — open
`index.html` and it works. All data is stored in the browser's `localStorage`
on the device that entered it, so it also runs offline and can be installed to
a phone or tablet home screen.

## Running it

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from the file system works too, but serving it
over `http(s)` also registers the service worker, which is what makes the app
work offline and installable ("Add to Home Screen").

On first run the app offers to load a **sample workshop** — three months of
job cards, payments, expenses, reviews and stock. Erase it from
**Setup → Data → Erase all data** when you are ready for real numbers.

## The ten sections

| Tab | What it is for |
|---|---|
| **Dashboard** | Money for the chosen period, vehicles on the floor, today's bookings, who needs a call, latest reviews, low-stock warnings. |
| **Job Cards** | The core record: one card per vehicle, with services, technicians, charges, payments, status and printable job card + invoice. List view or workshop board. |
| **Bookings** | Slot bookings by day and bay, WhatsApp reminders, and one-click conversion into a job card when the vehicle arrives. |
| **Customers** | Customers, their vehicles, full service history, lifetime spend, dues and ratings. |
| **Feedback** | Ratings per job, per aspect and per technician, open complaints, a tablet form the customer fills in, and a review-request list. |
| **Follow-ups** | The daily call list — coating/PPF warranties ending, washes and services falling due, money to collect, cars ready for delivery, own reminders. |
| **Inventory** | Shampoo, compound, coating, PPF film and the rest: stock in hand, re-order alerts, purchases, and automatic deduction when a job is delivered. |
| **Accounts** | Payments in, expenses out, day book with running cash balance, and outstanding receivables. |
| **Reports** | Revenue by service, by vehicle size and by month; technician performance and commission; top customers; busiest days; new vs repeat. |
| **Setup** | Service menu and prices, staff, workshop details and billing, backup / restore. |

## How the workshop flow works

1. **Booking** (optional) → customer calls, you take a slot with bay and technician.
2. **Job card** → vehicle arrives, you record customer, vehicle, services,
   technician per service, odometer, fuel level and an intake check (spare
   wheel, tool kit, stereo, floor mats, existing scratches and dents). Print
   it and get it signed.
3. **Status** moves `Booked → Received → In Progress → Ready → Delivered`.
   Marking it *Delivered* asks for the balance payment and deducts the
   materials each service uses from stock.
4. **Invoice** prints with warranty lines for coating, PPF and paint, or goes
   out on WhatsApp.
5. **Feedback** is collected on the tablet or recorded by staff; anything at
   3 ★ or below shows up as an open complaint until you close it with the
   action you took.
6. **Follow-ups** then bring the customer back — next wash due, coating
   warranty ending, payment pending.

## Pricing model

Every service carries a price **per vehicle size** (Bike, Hatchback, Sedan,
SUV, Luxury by default). When you pick a service on a job card, the price for
that vehicle's size is filled in automatically and can still be edited on the
line. Each service also holds:

- **Time needed** — for planning the day.
- **Warranty (months)** — drives "warranty ending" follow-ups; use it for
  ceramic coating, PPF and paint.
- **Remind again after (days)** — drives repeat-service reminders (wash every
  15 days, detailing every 120 days, and so on).
- **Materials** — inventory items and quantities consumed, deducted
  automatically on delivery.

Sizes, bays, expense categories, tax label and rate, currency symbol and the
job-card number series are all editable in **Setup → Workshop**.

## How the numbers are calculated

- **Revenue billed** — total of all non-cancelled job cards dated in the range
  (subtotal − discount + tax).
- **Cash collected** — payments actually received in the range, whatever job
  card they belong to.
- **Expenses** — shop costs recorded in Accounts, plus material purchases when
  you tick "also record as an expense".
- **Gross profit** — billed − expenses. Material cost is inside expenses when
  purchases are recorded, so it is not deducted twice.
- **Cash in hand** — opening balance + all payments received − all expenses.
- **Receivables** — for every job card, `total − payments received`, summed.
- **Rating** — mean of overall ratings; *happy customers* is the share at
  4 ★ or above; *recommend score* is promoters (5 ★) minus unhappy (≤ 3 ★) as
  a percentage of all reviews.
- **Technician revenue** — value of the job lines assigned to that person;
  **commission** is that value × the percentage on their staff record.
- **Running balance** in the day book starts from the opening balance and
  includes every movement before the window, so the closing figure is the true
  cash position on that date.

## Data, backup and safety

Data lives only in the browser profile that entered it. It is never uploaded
anywhere. So:

- Take a **backup** regularly (Setup → Data → Download backup). It is a JSON
  file that restores on any device.
- Clearing browser site data, or using a private window, loses everything.
- Each device keeps its own separate copy — use backup/restore to move data.

CSV exports are available for job cards, customers, feedback, bookings,
inventory, accounts and reports, plus an "export everything" dump, so figures
can be handed to an accountant or opened in a spreadsheet.

## Files

```
index.html                 app shell (top bar, tabs, modal host)
assets/styles.css          theme tokens, layout, light + dark, print rules
assets/util.js             formatting, dates, DOM, dialogs, CSV, print, charts
assets/store.js            data model, persistence, all derived calculations
assets/app.js              routing, global search, shared UI helpers
assets/view-*.js           one file per section
sw.js                      offline cache
manifest.webmanifest       installable-app metadata
fees/                      the earlier coaching-institute fee tracker, unchanged
```

No dependencies, no framework, no network calls.
