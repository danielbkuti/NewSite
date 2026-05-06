export const API = {
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();

    const res = await fetch(`/api/tasks/?${query}`, {
      credentials: "include"
    });

    return await res.json();
  },

  async createTask(name) {
    return fetch("/api/tasks/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      body: JSON.stringify({
        name,
        status: "pending",
        completed: false
      })
    });
  },

  async deleteTask(id) {
    return fetch(`/api/tasks/${id}/`, {
      method: "DELETE",
      headers: { "X-CSRFToken": getCSRFToken() }
    });
  },

  async toggleTask(id, completed) {
    return fetch(`/api/tasks/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      body: JSON.stringify({ completed: !completed })
    });
  }
};

export const AuthAPI = {
  // async login(username, password) {
  //   const res = await fetch("/user/api/login/", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "X-CSRFToken": getCSRFToken(),
  //     },
  //     credentials: "include",
  //     body: JSON.stringify({ username, password }),
  //   });

  //   return res.json();
  // },

  // async register(username, password) {
  //   const res = await fetch("/user/api/register/", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "X-CSRFToken": getCSRFToken(),
  //     },
  //     credentials: "include",
  //     body: JSON.stringify({ username, password }),
  //   });

  //   return res.json();
  // },

  async logout() {
    await fetch("/user/api/logout/", {
      method: "POST",
      credentials: "include",
    });
  }
};

function getCSRFToken() {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken'));

  return cookie ? cookie.split('=')[1] : '';
};