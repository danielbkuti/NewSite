import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Explicit UTC so the displayed date always matches what was actually
// stored/submitted, regardless of the viewer's local timezone — a
// plain toLocaleDateString() can roll the date back a day for anyone
// west of UTC. Shared by TaskCard and the task detail page.
export function formatDeadline(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Subtasks collectively count for 80% of the bar; the last 20% only
// closes up when the task itself is explicitly checked off complete —
// finishing every subtask does not do this automatically (see
// Task.update_completion_status on the backend), so the last 20% is a
// deliberate separate action, gated on every subtask already being
// done. A task with no subtasks has no 80/20 split to make — its own
// completion is the whole bar.
export function calculateProgress(task) {
  const total = task.subtasks.length;
  if (total === 0) {
    return task.completed ? 100 : 0;
  }
  const completed = task.subtasks.filter((s) => s.completed).length;
  const subtaskShare = (completed / total) * 80;
  const completionShare = task.completed ? 20 : 0;
  return Math.round(subtaskShare + completionShare);
}
