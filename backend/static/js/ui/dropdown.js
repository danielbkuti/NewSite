export function initDropdowns() {
  // Prevent multiple global click listeners
  if (!document._dropdownClickInit) {
    document._dropdownClickInit = true;

    document.addEventListener("click", (e) => {
      document.querySelectorAll(".dropdown-container").forEach(container => {
        if (!container.contains(e.target)) {
          const menu = container.querySelector(".dropdown-menu");
          const btn = container.querySelector("button");

          closeMenu(menu, btn);
        }
      });
    });
  }

  // Initialize each dropdown container
  document.querySelectorAll(".dropdown-container").forEach(container => {
    if (container.dataset.initialized) return;

    container.dataset.initialized = "true";

    const menu = container.querySelector(".dropdown-menu");
    const btn = container.querySelector("button");

    if (!menu || !btn) return;

    // Each container gets its own timeout
    container.addEventListener("mouseleave", () => {
      container._closeTimeout = setTimeout(() => {
        closeMenu(menu, btn);
      }, 800);
    });

    container.addEventListener("mouseenter", () => {
      clearTimeout(container._closeTimeout);
    });
  });
}

export function toggleDropdown(event, containerId) {
  event.stopPropagation();

  const container = document.getElementById(containerId);
  if (!container) return;

  const menu = container.querySelector(".dropdown-menu");
  const btn = container.querySelector("button");

  if (!menu || !btn) return;

  const isOpen = menu.classList.contains("opacity-100");

  closeAll();

  if (!isOpen) {
    openMenu(menu);
    btn.classList.add("active-gradient");
  }
}

function openMenu(menu) {
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
    const menu = container.querySelector(".dropdown-menu");
    const btn = container.querySelector("button");

    closeMenu(menu, btn);
  });
}