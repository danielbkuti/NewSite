// static/js/app.js

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

// Initial load
// document.addEventListener("DOMContentLoaded", async () => {
//     const app = document.getElementById("app");
//     app.innerHTML = "";
//     const auth = await checkAuth();

//   if (auth.authenticated) {
//     renderTasks(app, auth.username);
//   } else {
//     renderLanding(app);
//   }
// });