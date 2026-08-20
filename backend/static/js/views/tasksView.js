import { TaskList } from "../components/TaskList.js";

export function renderTasksView(app, tasks) {
  app.innerHTML = `
    <div class="p-6">
      <h1 class="text-xl font-bold mb-4">Your Tasks</h1>

      <!-- Controls -->
      <div class="flex gap-4 mb-4">
        <select id="filter-status" class="border p-2">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select id="sort-order" class="border p-2">
          <option value="-dateDeadline">Deadline (Newest)</option>
          <option value="dateDeadline">Deadline (Oldest)</option>
          <option value="-dateCreated">Created (Newest)</option>
        </select>

        <button id="applyFilters" class="bg-blue-500 text-white px-3 py-1 rounded">
          Apply
        </button>
      </div>

      <!-- Task List -->
      <div id="task-list">
        ${TaskList(tasks)}
      </div>
    </div>
  `;
}