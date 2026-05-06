// ===== IMPORTS =====
import { API, AuthAPI } from "./services/api.js";
import { renderLanding } from "./views/landingView.js";
import { renderTasksView } from "./views/tasksView.js";
import { initDropdowns, toggleDropdown } from "./ui/dropdown.js";

// ===== ROOT ELEMENT =====
const app = document.getElementById("app");

// ===== AUTH =====
async function checkAuth() {
  try {
    const res = await fetch("/user/api/auth/", {
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    console.error("Auth check failed:", err);
    return { authenticated: false };
  }
}
// async function initCSRF() {
//   await fetch("/user/api/csrf/", {
//     credentials: "include"
//   });
// }

// ===== CONTROLLER =====
async function loadTasks(params = {}) {
  try {
    const data = await API.getTasks(params);

    if (!data || !data.results) {
      throw new Error("Invalid response");
    }

    renderTasksView(app, data.results);
  } catch (err) {
    console.error("Failed to load tasks:", err);
    app.innerHTML = `<p class="text-red-500">Failed to load tasks</p>`;
  }
}

// ===== TASK ACTIONS (GLOBAL) =====
window.deleteTask = async (id) => {
  await API.deleteTask(id);
  loadTasks();
};

window.toggleComplete = async (id, completed) => {
  await API.toggleTask(id, completed);
  loadTasks();
};

// ===== NAVBAR FUNCTIONS =====

// Home
window.renderLanding = () => {
  renderLanding(app);
};

// Load tasks from navbar
window.loadTasks = loadTasks;

// Dropdowns

window.toggleTasksMenu = (event) => {
  toggleDropdown(event, "tasks-container");
};

window.toggleGoalsMenu = (event) => {
  toggleDropdown(event, "goals-container");
};

// Future feature
window.showCreateTask = () => {
  console.log("TODO: show create task UI");
};

//   window.handleLogin = async () => {
//   const username = document.getElementById("username").value;
//   const password = document.getElementById("password").value;

//   const res = await AuthAPI.login(username, password);

//   if (res.error) {
//     document.getElementById("error").innerText = res.error;
//   } else {
//     loadTasks(); // redirect into app
//   }
// };

// window.handleRegister = async () => {
//   const username = document.getElementById("username").value;
//   const password = document.getElementById("password").value;

//   const res = await AuthAPI.register(username, password);

//   if (res.error) {
//     document.getElementById("error").innerText = res.error;
//   } else {
//     loadTasks();
//   }
// };

// Logout
window.logout = async () => {
  await AuthAPI.logout();
  renderLanding(app);
};

// ===== FILTER + SORT CONTROLS =====
function attachTaskControls() {
  const filter = document.getElementById("filter-status");
  const sort = document.getElementById("sort-order");
  const btn = document.getElementById("applyFilters");

  if (!filter || !sort || !btn) return;

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

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  initDropdowns();

  //await initCSRF();   // 🔥 MUST COME FIRST

  const auth = await checkAuth();

  if (auth.authenticated) {
    loadTasks();
  } else {
    renderLanding(app);
  }
});
