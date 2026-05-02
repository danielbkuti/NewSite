async function fetchTasks() {
    const list = document.getElementById("task-list");

    // ✅ UX: show loading
    list.innerHTML = "<p class='loading'>Loading...</p>";

    try {
        const response = await fetch("/api/tasks/");
        const data = await response.json();

        list.innerHTML = "";

        data.results.forEach(task => {
            const card = document.createElement("div");
            card.className = "task-card";

            const name = document.createElement("span");
            name.className = "task-name";
            name.textContent = task.name;

            if (task.completed) {
                name.classList.add("completed");
            }

            name.onclick = () => toggleComplete(task.id, task.completed);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "X";
            deleteBtn.className = "delete-btn";
            deleteBtn.onclick = () => deleteTask(task.id);

            card.appendChild(name);
            card.appendChild(deleteBtn);

            list.appendChild(card);
        });

    } catch (error) {
        // ✅ UX: error state
        list.innerHTML = "Failed to load tasks.";
        console.error(error);
    }
}

async function createTask() {
    const input = document.getElementById("task-input");

    // ✅ UX: prevent empty tasks
    if (!input.value.trim()) {
        alert("Task cannot be empty");
        return;
    }

    try {
        await fetch("/api/tasks/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({
                name: input.value,
                status: "pending",
                completed: false
            })
        });

        input.value = "";
        fetchTasks();

    } catch (error) {
        alert("Failed to create task");
        console.error(error);
    }
}

async function deleteTask(taskId) {
    try {
        await fetch(`/api/tasks/${taskId}/`, {
            method: "DELETE",
            headers: {
                "X-CSRFToken": getCSRFToken(),
            }
        });

        fetchTasks();

    } catch (error) {
        alert("Failed to delete task");
        console.error(error);
    }
}

function getCSRFToken() {
    const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken'));

    return cookie ? cookie.split('=')[1] : '';
}

async function toggleComplete(taskId, completed) {
    try {
        await fetch(`/api/tasks/${taskId}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({
                completed: !completed
            })
        });

        fetchTasks();

    } catch (error) {
        alert("Failed to update task");
        console.error(error);
    }
}

async function checkAuth() {
  try {
    const response = await fetch("/user/api/auth/", {
      credentials: "include" // VERY IMPORTANT
    });

    const data = await response.json();
    console.log(data);
    return data;
    

  } catch (error) {
    console.error("Auth check failed", error);
    return { authenticated: false };
  }
}

// Landing Page
function renderLanding(app) {
  app.innerHTML = `
    <div style="padding:20px">
      <h1>Welcome to Task Manager</h1>
      <p>Please log in</p>
      <a href="/login/">Login</a>
    </div>
  `;


  document.getElementById("goTasks").onclick = renderTasks;
  document.getElementById("toggleTest").onclick = renderBlank;
}

// Task Page
function renderTasks() {
  app.innerHTML = `
    <div style="padding:20px">
      <h1>Your Tasks</h1>
      <div id="task-list">Loading...</div>
      <button id="goHome">Back</button>
    </div>
  `;

  document.getElementById("goHome").onclick = renderLanding;
  document.getElementById("toggleTest").onclick = renderBlank;

  // THEN fetch data
  fetchTasks();
}

function renderBlank(){
    app.innerHTML =  '';

    document.getElementById("toggleTest").onclick = renderLanding;
}



let closeTimeout;

function toggleTasksMenu(event) {
  event.stopPropagation();

    const menu = document.getElementById("dropdown-tasks");
    const btn = document.getElementById("tasks-btn");

    const isOpen = menu.classList.contains("opacity-100");

    if (isOpen) {
    closeMenu(menu,btn);
    btn.classList.remove("active-gradient");
    } else {
        closeAllDropdowns();
    openMenu(menu);
    btn.classList.add("active-gradient");
    }
}

function toggleGoalsMenu(event) {
    event.stopPropagation();

    const menu = document.getElementById("dropdown-goals");
    const btn = document.getElementById("goals-btn");

    const isOpen = menu.classList.contains("opacity-100");

    if (isOpen) {
        closeMenu(menu, btn);
        btn.classList.remove("active-gradient");
    } else {
        closeAllDropdowns();
        openMenu(menu);
        btn.classList.add("active-gradient");
    }
}

function setActive(btn) {
  btn.classList.add(
    "bg-gradient-to-r",
    "from-blue-500",
    "to-purple-600",
    "bg-clip-text",
    "text-transparent"
  );
}

function removeActive(btn) {
  btn.classList.remove(
    "bg-gradient-to-r",
    "from-blue-500",
    "to-purple-600",
    "bg-clip-text",
    "text-transparent"
  );
}

function openMenu(menu) {
  clearTimeout(closeTimeout);

  menu.classList.remove("opacity-0", "translate-y-2", "pointer-events-none");
  menu.classList.add("opacity-100", "translate-y-0");
}

function closeMenu(menu, btn) {
    if (!menu) return;

    menu.classList.remove("opacity-100", "translate-y-0");
    menu.classList.add("opacity-0", "translate-y-2", "pointer-events-none");

    if (btn) btn.classList.remove("active-gradient");
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown-container").forEach(container => {
    const menu = container.querySelector(".dropdown-menu");
    const btn = container.querySelector("button");

    if (menu && btn) {
      closeMenu(menu, btn);
    }
  });
}

/* Apply to ALL dropdown containers */
document.querySelectorAll(".dropdown-container").forEach(container => {

  const menu = container.querySelector('[id^="dropdown"]');
  const btn = container.querySelector("button");

container.addEventListener("mouseleave", () => {
  closeTimeout = setTimeout(() => {
    closeMenu(menu, btn);
  }, 800);
});

  container.addEventListener("mouseenter", () => {
    clearTimeout(closeTimeout);
  });

});


/* Click outside closes ALL dropdowns */
document.addEventListener("click", (e) => {
  document.querySelectorAll(".dropdown-container").forEach(container => {

    if (!container.contains(e.target)) {
      const menu = container.querySelector('[id^="dropdown"]');
      const btn = container.querySelector("button");

      closeMenu(menu);
      removeActive(btn);
    }

  });
});

