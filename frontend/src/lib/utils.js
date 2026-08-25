import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Shows both the date and time of day, in the viewer's own local
// timezone — deadlines/completion times now carry a real time of day,
// not just a date, so the display needs to mean the same clock time
// the person actually picked (or the same moment completion happened).
// This intentionally moved off the previous forced UTC + date-only
// display: once time-of-day matters, showing it in UTC would print a
// different clock time than whatever was typed into a local
// datetime-local input. The tradeoff is that any deadline set before
// this feature existed (date-only, stored as UTC midnight) can now
// display as the evening before for anyone west of UTC — an accepted
// cost of correct time-of-day display going forward, not a bug in new
// entries. Shared by TaskCard and the task detail page.
export function formatDeadline(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The inverse of the above, for pre-filling a <input type="datetime-local">
// — that input's value is always local wall-clock time with no
// timezone info, so this can't just slice the stored UTC ISO string
// (that would show the UTC clock time mislabeled as local). Date's
// getFullYear/getMonth/etc. are local-timezone getters, which is
// exactly what's needed here.
export function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Once a deadline is this close (or closer), it's treated as "urgent"
// — a live countdown badge on the task/tasks list, and a one-time
// heads-up bubble on the task detail page. Shared so both places agree
// on what "close to the deadline" means.
export const URGENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isDeadlineUrgent(iso, completed) {
  if (completed || !iso) return false;
  const remaining = new Date(iso).getTime() - Date.now();
  return remaining > 0 && remaining <= URGENT_WINDOW_MS;
}

// The task list's default sort buckets active items into "due this
// week" (anything at or before now + 7 days — overdue included, since
// an overdue date is even sooner than that), "no deadline", then
// "later". A dedicated sort/filter UI is planned, but this is the
// baseline ordering until it exists.
export const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// The task itself counts as one item alongside its subtasks, all
// weighted equally — 1 subtask + the task = 2 items, so finishing the
// one subtask (task not yet explicitly checked off complete — see
// Task.update_completion_status on the backend, finishing every
// subtask does not do that automatically) reads as 50%, not some
// fixed fraction of a bar the task's own completion separately tops
// off. A task with no subtasks has just the one item — its own
// completion is the whole bar, 0% or 100%.
export function calculateProgress(task) {
  const totalItems = task.subtasks.length + 1;
  const completedItems = task.subtasks.filter((s) => s.completed).length + (task.completed ? 1 : 0);
  return Math.round((completedItems / totalItems) * 100);
}
