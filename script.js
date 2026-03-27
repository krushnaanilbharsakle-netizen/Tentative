const STORAGE_KEY = "taskflow.tasks";
const IMPORTANCE_RANK = { High: 0, Medium: 1, Low: 2 };

const state = {
  tasks: loadTasks(),
  selectedDate: getTodayKey(),
  viewMonth: startOfMonth(parseDateKey(getTodayKey())),
  editingTaskId: null,
};

const currentDateEl = document.getElementById("currentDate");
const currentTimeEl = document.getElementById("currentTime");
const monthLabelEl = document.getElementById("monthLabel");
const calendarGridEl = document.getElementById("calendarGrid");
const taskPanelTitleEl = document.getElementById("taskPanelTitle");
const taskSummaryEl = document.getElementById("taskSummary");
const taskListEl = document.getElementById("taskList");
const openTaskModalBtn = document.getElementById("openTaskModal");
const modalBackdropEl = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");
const taskForm = document.getElementById("taskForm");
const modalTitleEl = document.getElementById("modalTitle");
const saveTaskBtn = document.getElementById("saveTaskBtn");
const taskIdInput = document.getElementById("taskId");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskDateInput = document.getElementById("taskDateInput");
const taskImportanceInput = document.getElementById("taskImportanceInput");

initializeApp();

function initializeApp() {
  syncViewportHeight();
  bindEvents();
  updateHeaderClock();
  setInterval(updateHeaderClock, 1000);
  render();
}

function bindEvents() {
  window.addEventListener("resize", syncViewportHeight);
  window.addEventListener("orientationchange", syncViewportHeight);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewportHeight);
  }

  openTaskModalBtn.addEventListener("click", () => openModal());
  closeModalBtn.addEventListener("click", closeModal);
  prevMonthBtn.addEventListener("click", () => moveMonth(-1));
  nextMonthBtn.addEventListener("click", () => moveMonth(1));
  todayBtn.addEventListener("click", goToToday);
  taskForm.addEventListener("submit", handleTaskSubmit);

  modalBackdropEl.addEventListener("click", (event) => {
    if (event.target === modalBackdropEl) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalBackdropEl.classList.contains("is-open")) {
      closeModal();
    }
  });

  calendarGridEl.addEventListener("click", (event) => {
    const dayButton = event.target.closest(".calendar-day");

    if (!dayButton) {
      return;
    }

    const dateKey = dayButton.dataset.date;
    state.selectedDate = dateKey;
    state.viewMonth = startOfMonth(parseDateKey(dateKey));
    render();
  });

  taskListEl.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    const taskId = actionButton.dataset.id;

    if (actionButton.dataset.action === "edit") {
      const task = state.tasks.find((item) => item.id === taskId);
      if (task) {
        openModal(task);
      }
    }

    if (actionButton.dataset.action === "delete") {
      deleteTask(taskId);
    }
  });

  taskListEl.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-toggle-id]");

    if (!checkbox) {
      return;
    }

    toggleTaskCompletion(checkbox.dataset.toggleId, checkbox.checked);
  });
}

function render() {
  renderCalendar();
  renderTaskList();
}

function renderCalendar() {
  monthLabelEl.textContent = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(state.viewMonth);

  calendarGridEl.innerHTML = "";

  const firstDayOfMonth = startOfMonth(state.viewMonth);
  const gridStart = new Date(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    1 - firstDayOfMonth.getDay()
  );
  const todayKey = getTodayKey();

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index
    );
    const dateKey = formatDateKey(cellDate);
    const hasTasks = getTasksForDate(dateKey).length > 0;

    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = [
      "calendar-day",
      cellDate.getMonth() !== state.viewMonth.getMonth() ? "is-outside" : "",
      dateKey === state.selectedDate ? "is-selected" : "",
      dateKey === todayKey ? "is-today" : "",
    ]
      .filter(Boolean)
      .join(" ");
    dayButton.dataset.date = dateKey;
    dayButton.setAttribute("role", "gridcell");
    dayButton.setAttribute(
      "aria-label",
      `${formatLongDate(cellDate)}${hasTasks ? ", has tasks" : ""}`
    );

    dayButton.innerHTML = `
      <span class="calendar-day__number">${cellDate.getDate()}</span>
      ${hasTasks ? '<span class="calendar-day__dot" aria-hidden="true"></span>' : ""}
    `;

    calendarGridEl.appendChild(dayButton);
  }
}

function renderTaskList() {
  const selectedDate = parseDateKey(state.selectedDate);
  const tasksForDate = sortTasks(getTasksForDate(state.selectedDate));
  const completedCount = tasksForDate.filter((task) => task.completed).length;

  taskPanelTitleEl.textContent = `Tasks for ${formatSelectedDate(selectedDate)}`;
  taskSummaryEl.textContent = tasksForDate.length
    ? `${tasksForDate.length} total | ${completedCount} done`
    : "No tasks yet";

  taskListEl.innerHTML = "";

  if (!tasksForDate.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <div>
        <strong>Your day is clear.</strong>
        <p>Add a task to start planning this date.</p>
      </div>
    `;
    taskListEl.appendChild(emptyState);
    return;
  }

  tasksForDate.forEach((task) => {
    const card = document.createElement("article");
    card.className = `task-card${task.completed ? " is-complete" : ""}`;

    card.innerHTML = `
      <div class="task-card__check">
        <input
          class="task-checkbox"
          type="checkbox"
          data-toggle-id="${task.id}"
          ${task.completed ? "checked" : ""}
          aria-label="Mark ${escapeHtml(task.title)} complete"
        >
      </div>

      <div class="task-card__content">
        <div class="task-card__top">
          <div>
            <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
            <p class="task-card__date">Due ${formatShortDate(parseDateKey(task.dueDate))}</p>
          </div>
          <span class="badge badge--${task.importance.toLowerCase()}">${task.importance}</span>
        </div>

        <div class="task-card__actions">
          <button class="action-button" type="button" data-action="edit" data-id="${task.id}" aria-label="Edit task">
            ${getEditIcon()}
          </button>
          <button class="action-button" type="button" data-action="delete" data-id="${task.id}" aria-label="Delete task">
            ${getDeleteIcon()}
          </button>
        </div>
      </div>
    `;

    taskListEl.appendChild(card);
  });
}

function openModal(task = null) {
  state.editingTaskId = task ? task.id : null;
  taskIdInput.value = task ? task.id : "";
  taskTitleInput.value = task ? task.title : "";
  taskDateInput.value = task ? task.dueDate : state.selectedDate;
  taskImportanceInput.value = task ? task.importance : "Medium";
  modalTitleEl.textContent = task ? "Edit Task" : "Add Task";
  saveTaskBtn.textContent = task ? "Update Task" : "Save Task";
  modalBackdropEl.classList.add("is-open");
  modalBackdropEl.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => taskTitleInput.focus());
}

function closeModal() {
  modalBackdropEl.classList.remove("is-open");
  modalBackdropEl.setAttribute("aria-hidden", "true");
  taskForm.reset();
  taskIdInput.value = "";
  taskDateInput.value = state.selectedDate;
  taskImportanceInput.value = "Medium";
  state.editingTaskId = null;
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  const dueDate = taskDateInput.value;
  const importance = taskImportanceInput.value;

  if (!title || !dueDate || !importance) {
    return;
  }

  if (state.editingTaskId) {
    state.tasks = state.tasks.map((task) =>
      task.id === state.editingTaskId
        ? { ...task, title, dueDate, importance }
        : task
    );
  } else {
    state.tasks.push({
      id: createTaskId(),
      title,
      dueDate,
      importance,
      completed: false,
      createdAt: Date.now(),
    });
  }

  state.selectedDate = dueDate;
  state.viewMonth = startOfMonth(parseDateKey(dueDate));
  persistTasks();
  closeModal();
  render();
}

function deleteTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  if (!window.confirm(`Delete "${task.title}"?`)) {
    return;
  }

  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  persistTasks();
  render();
}

function toggleTaskCompletion(taskId, completed) {
  state.tasks = state.tasks.map((task) =>
    task.id === taskId ? { ...task, completed } : task
  );
  persistTasks();
  renderTaskList();
  renderCalendar();
}

function moveMonth(direction) {
  state.viewMonth = new Date(
    state.viewMonth.getFullYear(),
    state.viewMonth.getMonth() + direction,
    1
  );
  renderCalendar();
}

function goToToday() {
  state.selectedDate = getTodayKey();
  state.viewMonth = startOfMonth(parseDateKey(state.selectedDate));
  render();
}

function getTasksForDate(dateKey) {
  return state.tasks.filter((task) => task.dueDate === dateKey);
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const importanceDifference = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];

    if (importanceDifference !== 0) {
      return importanceDifference;
    }

    const dateDifference = a.dueDate.localeCompare(b.dueDate);
    if (dateDifference !== 0) {
      return dateDifference;
    }

    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function loadTasks() {
  try {
    const rawTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = rawTasks ? JSON.parse(rawTasks) : [];

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks
      .filter((task) => task && typeof task === "object")
      .map((task) => ({
        id: String(task.id || createTaskId()),
        title: String(task.title || "").trim(),
        dueDate: typeof task.dueDate === "string" ? task.dueDate : getTodayKey(),
        importance: ["Low", "Medium", "High"].includes(task.importance) ? task.importance : "Medium",
        completed: Boolean(task.completed),
        createdAt: Number(task.createdAt) || Date.now(),
      }))
      .filter((task) => task.title);
  } catch (error) {
    console.error("Could not load tasks from storage:", error);
    return [];
  }
}

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function syncViewportHeight() {
  const viewportHeight = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;

  document.documentElement.style.setProperty("--app-height", `${Math.round(viewportHeight)}px`);
}

function updateHeaderClock() {
  const now = new Date();
  currentDateEl.textContent = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(now);
  currentTimeEl.textContent = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatSelectedDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function createTaskId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getEditIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17.25V21h3.75l11-11.03-3.75-3.72L3 17.25Zm17.71-10.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.96 1.96 3.75 3.75 2.12-2.09Z"/>
    </svg>
  `;
}

function getDeleteIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Zm-1 11h12a2 2 0 0 0 2-2V8H4v11a2 2 0 0 0 2 2Z"/>
    </svg>
  `;
}
