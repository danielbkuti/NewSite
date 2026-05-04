export function TaskCard(task) {
  return `
    <div class="p-4 border rounded flex justify-between">
      <span onclick="window.toggleComplete(${task.id}, ${task.completed})">
        ${task.name}
      </span>
      <button onclick="window.deleteTask(${task.id})">X</button>
    </div>
  `;
}