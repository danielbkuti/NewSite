import { API } from "./services/api.js";
import { renderTasksView } from "./views/tasksView.js";
import { renderLanding } from "./views/landingView.js";
import { initDropdowns, toggleDropdown } from "./ui/dropdown.js";

const app = document.getElementById("app");

/* ===== GLOBAL FUNCTIONS (for onclick) ===== */
window.deleteTask = async (id) => {
  await API.deleteTask(id);
  loadTasks();
};

window.toggleComplete = async (id, completed) => {
  await API.toggleTask(id, completed);
  loadTasks();
};

window.toggleDropdown = toggleDropdown;

function attachTaskControls() {
  const filter = document.getElementById("filter-status");
  const sort = document.getElementById("sort-order");
  const btn = document.getElementById("applyFilters");

  btn.onclick = () => {
    const params = {};

    if (filter.value) {
      params.status = filter.value;
    }

    if (sort.value) {
      params.ordering = sort.value;
    }

    loadTasks(params);
  };
}

/* ===== CONTROLLER ===== */
async function loadTasks(params = {}) {
  const data = await API.getTasks(params);
  renderTasksView(app, data.results);

  attachTaskControls(); // rebind events after render
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  renderLanding(app);
  initDropdowns();
});