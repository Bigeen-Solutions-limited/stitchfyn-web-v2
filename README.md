# stitchfyn-web

The frontend for StitchFYN. It shows what the backend reports and works nothing out on its own. Stage progress, risk levels and balances all come from the API. The browser does not calculate them.

## How a change reaches the screen

The app never shows a change before the server accepts it (no "optimistic UI"). Every change follows the same steps:

1. Send the `POST`/`PATCH`/`DELETE` to the API.
2. Show a success toast to say the request went through.
3. Mark the related TanStack Query cache entries as out of date ("invalidate" them).
4. Fetch them again from the server.
5. Show whatever the server now says.

If the screen shows something wrong, it is showing what the API returned. Check the backend first.

## What's here

- **Production dashboard**: deadline risk and workshop load at a glance.
- **Order detail**: the full order, with the live workflow graph.
- **Intake wizard**: find the customer, take measurements, create the order.
- **Material vault**: stock levels, reservations and the material ledger.
- **Measurement archive**: every version is kept. Nothing is overwritten.
- **Customer portal**: a read-only order status page for customers.
- **StitchScore**: the workshop's reputation and on-time delivery figures.
- **Fabric safety flow**: photo checks when fabric comes in, and dispute handling.
- **Group order coordination**: several orders booked together for one event.
- **Deadline countdown**: a daily digest, and escalation when a timeline gets urgent.
- **Audit trail viewer**: the full evidence record, for settling disputes.
- **Analytics dashboard**: revenue, speed of work and activity reports.
- **Transparency panel**: trust, capacity and audit-health indicators for staff.

## Tech stack

- [React 19](https://react.dev/) on Vite
- [TanStack Query v5](https://tanstack.com/query/latest) for data fetched from the server
- [Zustand](https://zustand-demo.pmnd.rs/) for the small amount of state that lives only in the browser (the signed-in session, UI toggles)
- MUI (Material UI) components, themed from `src/design-system/theme`, with shared design tokens in plain CSS
- Axios, which quietly refreshes the sign-in token when the API answers 401

## Directory structure

- `src/app`: routing and the top-level providers
- `src/components`: shared UI building blocks (timelines, steppers, badges, data grids)
- `src/features`: one folder per area of the product (auth, orders, workflow, materials and so on), matching the backend's modules
- `src/design-system`: design tokens and shared styling

## Commands

```bash
npm install
npm run dev     # start the Vite dev server
npm run build   # production build
npm run lint    # ESLint
npm test        # Vitest
```
