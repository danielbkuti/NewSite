import { TaskCard } from "./TaskCard.js";

export function TaskList(tasks) {
  return `
    <div class="space-y-2">
      ${tasks.map(TaskCard).join("")}
    </div>
  `;
}