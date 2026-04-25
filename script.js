const STORAGE_KEY = "taskflow.tasks";
const EVENT_STORAGE_KEY = "taskflow.events";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IMPORTANCE_RANK = { High: 0, Medium: 1, Low: 2 };
const REPEAT_OPTIONS = ["None", "Daily", "Weekly", "Monthly"];

const state = {
  tasks: loadTasks(),
  events: loadEvents(),
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
const dayEventsEl = document.getElementById("dayEvents");
const taskListEl = document.getElementById("taskList");
const openTaskModalBtn = document.getElementById("openTaskModal");
const openEventModalBtn = document.getElementById("openEventModal");
const modalBackdropEl = document.getElementById("modalBackdrop");
const eventModalBackdropEl = document.getElementById("eventModalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeEventModalBtn = document.getElementById("closeEventModalBtn");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");
const taskForm = document.getElementById("taskForm");
const eventForm = document.getElementById("eventForm");
const modalTitleEl = document.getElementById("modalTitle");
const eventModalTitleEl = document.getElementById("eventModalTitle");
const saveTaskBtn = document.getElementById("saveTaskBtn");
const saveEventBtn = document.getElementById("saveEventBtn");
const taskIdInput = document.getElementById("taskId");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskDateInput = document.getElementById("taskDateInput");
const taskImportanceInput = document.getElementById("taskImportanceInput");
const taskRepeatInput = document.getElementById("taskRepeatInput");
const eventOriginalDateInput = document.getElementById("eventOriginalDate");
const eventDateInput = document.getElementById("eventDateInput");
const eventDescriptionInput = document.getElementById("eventDescriptionInput");

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
  openEventModalBtn.addEventListener("click", openEventModal);
  closeModalBtn.addEventListener("click", closeModal);
  closeEventModalBtn.addEventListener("click", closeEventModal);
  prevMonthBtn.addEventListener("click", () => moveMonth(-1));
  nextMonthBtn.addEventListener("click", () => moveMonth(1));
  todayBtn.addEventListener("click", goToToday);
  taskForm.addEventListener("submit", handleTaskSubmit);
  eventForm.addEventListener("submit", handleEventSubmit);

  modalBackdropEl.addEventListener("click", (event) => {
    if (event.target === modalBackdropEl) {
      closeModal();
    }
  });

  eventModalBackdropEl.addEventListener("click", (event) => {
    if (event.target === eventModalBackdropEl) {
      closeEventModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (modalBackdropEl.classList.contains("is-open")) {
      closeModal();
    }

    if (eventModalBackdropEl.classList.contains("is-open")) {
      closeEventModal();
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
  renderDayEvents();
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
    const hasEvent = hasEventOnDate(dateKey);

    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = [
      "calendar-day",
      cellDate.getMonth() !== state.viewMonth.getMonth() ? "is-outside" : "",
      dateKey === state.selectedDate ? "is-selected" : "",
      dateKey === todayKey ? "is-today" : "",
      hasEvent ? "has-event" : "",
    ]
      .filter(Boolean)
      .join(" ");
    dayButton.dataset.date = dateKey;
    dayButton.setAttribute("role", "gridcell");
    dayButton.setAttribute(
      "aria-label",
      `${formatLongDate(cellDate)}${hasTasks ? ", has tasks" : ""}${hasEvent ? ", has event" : ""}`
    );

    dayButton.innerHTML = `
      <span class="calendar-day__number">${cellDate.getDate()}</span>
    `;

    calendarGridEl.appendChild(dayButton);
  }
}
function renderDayEvents() {
  const dayEvent = getEventForDate(state.selectedDate);
  dayEventsEl.innerHTML = "";

  if (!dayEvent) {
    return;
  }

  const eventCard = document.createElement("article");
  eventCard.className = "event-card";
  eventCard.innerHTML = `
    <p class="event-card__label">Day Event</p>
    <p class="event-card__description">${formatEventDescription(dayEvent.description)}</p>
  `;

  dayEventsEl.appendChild(eventCard);
}

function renderTaskList() {
  const selectedDate = parseDateKey(state.selectedDate);
  const tasksForDate = sortTasks(getTasksForDate(state.selectedDate));
  const completedCount = tasksForDate.filter((task) => isTaskCompletedOnDate(task, state.selectedDate)).length;

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
    const isCompleted = isTaskCompletedOnDate(task, state.selectedDate);
    const card = document.createElement("article");
    card.className = `task-card${isCompleted ? " is-complete" : ""}`;

    card.innerHTML = `
      <div class="task-card__check">
        <input
          class="task-checkbox"
          type="checkbox"
          data-toggle-id="${task.id}"
          ${isCompleted ? "checked" : ""}
          aria-label="Mark ${escapeHtml(task.title)} complete"
        >
      </div>

      <div class="task-card__content">
        <div class="task-card__top">
          <div>
            <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
            <p class="task-card__date">Due ${formatShortDate(parseDateKey(task.repeat === "None" ? task.dueDate : state.selectedDate))}</p>
            <p class="task-card__repeat">Repeats: ${escapeHtml(task.repeat)}</p>
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
  taskRepeatInput.value = task ? task.repeat : "None";
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
  taskRepeatInput.value = "None";
  state.editingTaskId = null;
}

function openEventModal() {
  const dayEvent = getEventForDate(state.selectedDate);
  eventOriginalDateInput.value = dayEvent ? dayEvent.date : "";
  eventDateInput.value = dayEvent ? dayEvent.date : state.selectedDate;
  eventDescriptionInput.value = dayEvent ? dayEvent.description : "";
  eventModalTitleEl.textContent = dayEvent ? "Edit Day Event" : "Add Day Event";
  saveEventBtn.textContent = dayEvent ? "Update Event" : "Save Event";
  eventModalBackdropEl.classList.add("is-open");
  eventModalBackdropEl.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => eventDescriptionInput.focus());
}

function closeEventModal() {
  eventModalBackdropEl.classList.remove("is-open");
  eventModalBackdropEl.setAttribute("aria-hidden", "true");
  eventForm.reset();
  eventOriginalDateInput.value = "";
  eventDateInput.value = state.selectedDate;
  eventDescriptionInput.value = "";
  eventModalTitleEl.textContent = "Add Day Event";
  saveEventBtn.textContent = "Save Event";
}
function handleTaskSubmit(event) {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  const dueDate = taskDateInput.value;
  const importance = taskImportanceInput.value;
  const repeat = taskRepeatInput.value;

  if (!title || !dueDate || !importance || !repeat) {
    return;
  }

  if (state.editingTaskId) {
    state.tasks = state.tasks.map((task) =>
      task.id === state.editingTaskId
        ? buildUpdatedTask(task, { title, dueDate, importance, repeat })
        : task
    );
  } else {
    state.tasks.push({
      id: createTaskId(),
      title,
      dueDate,
      importance,
      repeat,
      completed: false,
      completedDates: [],
      createdAt: Date.now(),
    });
  }

  state.selectedDate = dueDate;
  state.viewMonth = startOfMonth(parseDateKey(dueDate));
  persistTasks();
  closeModal();
  render();
}

function handleEventSubmit(event) {
  event.preventDefault();

  const originalDate = eventOriginalDateInput.value;
  const date = eventDateInput.value;
  const description = eventDescriptionInput.value.trim();

  if (!DATE_KEY_PATTERN.test(date) || !description) {
    return;
  }

  const eventsByDate = new Map(state.events.map((item) => [item.date, item]));
  const existingEvent = eventsByDate.get(date);
  const originalEvent = originalDate ? eventsByDate.get(originalDate) : null;

  if (originalDate && originalDate !== date) {
    eventsByDate.delete(originalDate);
  }

  eventsByDate.set(date, {
    date,
    description,
    createdAt: existingEvent?.createdAt || originalEvent?.createdAt || Date.now(),
  });

  state.events = [...eventsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  state.selectedDate = date;
  state.viewMonth = startOfMonth(parseDateKey(date));
  persistEvents();
  closeEventModal();
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
    task.id === taskId ? setTaskCompletionForDate(task, state.selectedDate, completed) : task
  );
  persistTasks();
  renderTaskList();
  renderCalendar();
}

function setTaskCompletionForDate(task, dateKey, completed) {
  if (task.repeat === "None") {
    return { ...task, completed };
  }

  const completedDates = new Set(getCompletedDates(task));

  if (completed) {
    completedDates.add(dateKey);
  } else {
    completedDates.delete(dateKey);
  }

  return {
    ...task,
    completed: false,
    completedDates: [...completedDates].sort(),
  };
}

function buildUpdatedTask(task, updates) {
  const nextTask = {
    ...task,
    ...updates,
  };

  if (nextTask.repeat === "None") {
    return {
      ...nextTask,
      completed: task.repeat === "None"
        ? task.completed
        : getCompletedDates(task).includes(nextTask.dueDate),
      completedDates: [],
    };
  }

  const shouldResetCompletedDates = task.repeat !== nextTask.repeat || task.dueDate !== nextTask.dueDate;
  const completedDates = shouldResetCompletedDates
    ? task.repeat === "None" && task.completed
      ? [nextTask.dueDate]
      : []
    : getCompletedDates(task);

  return {
    ...nextTask,
    completed: false,
    completedDates,
  };
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
  return state.tasks.filter((task) => taskOccursOnDate(task, dateKey));
}

function getEventForDate(dateKey) {
  return state.events.find((event) => event.date === dateKey) || null;
}

function hasEventOnDate(dateKey) {
  return Boolean(getEventForDate(dateKey));
}

function isTaskCompletedOnDate(task, dateKey) {
  if (task.repeat === "None") {
    return task.completed;
  }

  return getCompletedDates(task).includes(dateKey);
}

function taskOccursOnDate(task, dateKey) {
  if (dateKey < task.dueDate) {
    return false;
  }

  if (task.repeat === "Daily") {
    return true;
  }

  if (task.repeat === "Weekly") {
    return getDayDifference(task.dueDate, dateKey) % 7 === 0;
  }

  if (task.repeat === "Monthly") {
    return parseDateKey(task.dueDate).getDate() === parseDateKey(dateKey).getDate();
  }

  return task.dueDate === dateKey;
}

function getDayDifference(startDateKey, endDateKey) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const startDate = parseDateKey(startDateKey);
  const endDate = parseDateKey(endDateKey);

  return Math.round((endDate - startDate) / millisecondsPerDay);
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
      .map((task) => {
        const dueDate = typeof task.dueDate === "string" ? task.dueDate : getTodayKey();
        const repeat = REPEAT_OPTIONS.includes(task.repeat) ? task.repeat : "None";
        const completedDates = getCompletedDates(task);

        return {
          id: String(task.id || createTaskId()),
          title: String(task.title || "").trim(),
          dueDate,
          importance: ["Low", "Medium", "High"].includes(task.importance) ? task.importance : "Medium",
          repeat,
          completed: repeat === "None" ? Boolean(task.completed) : false,
          completedDates: repeat === "None"
            ? []
            : completedDates.length
              ? completedDates
              : Boolean(task.completed)
                ? [dueDate]
                : [],
          createdAt: Number(task.createdAt) || Date.now(),
        };
      })
      .filter((task) => task.title);
  } catch (error) {
    console.error("Could not load tasks from storage:", error);
    return [];
  }
}

function loadEvents() {
  try {
    const rawEvents = localStorage.getItem(EVENT_STORAGE_KEY);
    const parsedEvents = rawEvents ? JSON.parse(rawEvents) : [];

    if (!Array.isArray(parsedEvents)) {
      return [];
    }

    const eventsByDate = new Map();

    parsedEvents
      .filter((event) => event && typeof event === "object")
      .forEach((event) => {
        const date = typeof event.date === "string" ? event.date : "";
        const description = typeof event.description === "string" ? event.description.trim() : "";

        if (!DATE_KEY_PATTERN.test(date) || !description) {
          return;
        }

        eventsByDate.set(date, {
          date,
          description,
          createdAt: Number(event.createdAt) || Date.now(),
        });
      });

    return [...eventsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Could not load events from storage:", error);
    return [];
  }
}
function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function persistEvents() {
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(state.events));
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

function formatEventDescription(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function createTaskId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCompletedDates(task) {
  if (!Array.isArray(task.completedDates)) {
    return [];
  }

  return [...new Set(task.completedDates.filter((date) => typeof date === "string"))].sort();
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
