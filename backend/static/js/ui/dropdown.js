let closeTimeout;

export function initDropdowns() {
  document.querySelectorAll(".dropdown-container").forEach(container => {

    const menu = container.querySelector(".dropdown-menu");
    const btn = container.querySelector("button");

    container.addEventListener("mouseleave", () => {
      closeTimeout = setTimeout(() => closeMenu(menu, btn), 800);
    });

    container.addEventListener("mouseenter", () => {
      clearTimeout(closeTimeout);
    });

  });

  document.addEventListener("click", (e) => {
    document.querySelectorAll(".dropdown-container").forEach(container => {
      if (!container.contains(e.target)) {
        closeMenu(
          container.querySelector(".dropdown-menu"),
          container.querySelector("button")
        );
      }
    });
  });
}

export function toggleDropdown(event, containerId) {
  event.stopPropagation();

  const container = document.getElementById(containerId);
  const menu = container.querySelector(".dropdown-menu");
  const btn = container.querySelector("button");

  const isOpen = menu.classList.contains("opacity-100");

  closeAll();

  if (!isOpen) {
    openMenu(menu);
    btn.classList.add("active-gradient");
  }
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

function closeAll() {
  document.querySelectorAll(".dropdown-container").forEach(container => {
    closeMenu(
      container.querySelector(".dropdown-menu"),
      container.querySelector("button")
    );
  });
}