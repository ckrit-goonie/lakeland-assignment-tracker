const STORAGE_KEY = "lakeland-assignment-tracker-v1";

const starterAssignments = [
  {
    id: "starter-networking-module-1",
    title: "Module 1 Lesson: Introduction",
    course: "Networking and Telecommunications",
    due: "",
    priority: "Medium",
    status: "Not Started",
    notes: "Imported from Class Assignment scheduel.xlsx",
    createdAt: "2026-06-16T00:00:00.000Z",
  },
  {
    id: "starter-human-nature-reading",
    title: "Read pages 1-16",
    course: "Ideas of Human Nature",
    due: "",
    priority: "Medium",
    status: "Not Started",
    notes: "Imported from Class Assignment scheduel.xlsx",
    createdAt: "2026-06-16T00:00:00.000Z",
  },
  {
    id: "starter-human-nature-discussion",
    title: "Discussion 1 and 2 replies",
    course: "Ideas of Human Nature",
    due: "",
    priority: "High",
    status: "Not Started",
    notes: "Imported from Class Assignment scheduel.xlsx",
    createdAt: "2026-06-16T00:00:00.000Z",
  },
  {
    id: "starter-data-structures-homework",
    title: "Homework 1",
    course: "Data Structures",
    due: "",
    priority: "High",
    status: "Not Started",
    notes: "Imported from Class Assignment scheduel.xlsx",
    createdAt: "2026-06-16T00:00:00.000Z",
  },
  {
    id: "starter-data-structures-discussion",
    title: "Discussion 1",
    course: "Data Structures",
    due: "",
    priority: "Medium",
    status: "Not Started",
    notes: "Imported from Class Assignment scheduel.xlsx",
    createdAt: "2026-06-16T00:00:00.000Z",
  },
];

const state = {
  assignments: loadAssignments(),
  view: "all",
};

const els = {
  list: document.querySelector("#assignmentList"),
  empty: document.querySelector("#emptyState"),
  template: document.querySelector("#assignmentTemplate"),
  form: document.querySelector("#assignmentForm"),
  assignmentId: document.querySelector("#assignmentId"),
  titleInput: document.querySelector("#titleInput"),
  courseInput: document.querySelector("#courseInput"),
  dueInput: document.querySelector("#dueInput"),
  priorityInput: document.querySelector("#priorityInput"),
  statusInput: document.querySelector("#statusInput"),
  notesInput: document.querySelector("#notesInput"),
  searchInput: document.querySelector("#searchInput"),
  courseFilter: document.querySelector("#courseFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  courseOptions: document.querySelector("#courseOptions"),
  clearFormButton: document.querySelector("#clearFormButton"),
  exportButton: document.querySelector("#exportButton"),
  importFile: document.querySelector("#importFile"),
  resetButton: document.querySelector("#resetButton"),
  viewTitle: document.querySelector("#viewTitle"),
  viewSubtitle: document.querySelector("#viewSubtitle"),
  metricTotal: document.querySelector("#metricTotal"),
  metricDueSoon: document.querySelector("#metricDueSoon"),
  metricDone: document.querySelector("#metricDone"),
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    render();
  });
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const existingId = els.assignmentId.value;
  const assignment = {
    id: existingId || `assignment-${crypto.randomUUID()}`,
    title: els.titleInput.value.trim(),
    course: els.courseInput.value.trim(),
    due: els.dueInput.value,
    priority: els.priorityInput.value,
    status: els.statusInput.value,
    notes: els.notesInput.value.trim(),
    createdAt: existingId ? findAssignment(existingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
  };

  if (!assignment.title || !assignment.course) return;

  if (existingId) {
    state.assignments = state.assignments.map((item) => (item.id === existingId ? assignment : item));
  } else {
    state.assignments.push(assignment);
  }

  saveAssignments();
  clearForm();
  render();
});

[els.searchInput, els.courseFilter, els.statusFilter].forEach((input) => {
  input.addEventListener("input", render);
});

els.clearFormButton.addEventListener("click", clearForm);

els.resetButton.addEventListener("click", () => {
  if (!confirm("Restore the original starter data from your workbook? This replaces current tracker items.")) return;
  state.assignments = structuredClone(starterAssignments);
  saveAssignments();
  clearForm();
  render();
});

els.exportButton.addEventListener("click", () => {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), assignments: state.assignments }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lakeland-assignments.json";
  link.click();
  URL.revokeObjectURL(url);
});

els.importFile.addEventListener("change", async () => {
  const file = els.importFile.files?.[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());
    const imported = Array.isArray(data) ? data : data.assignments;
    if (!Array.isArray(imported)) throw new Error("Invalid assignment export.");
    state.assignments = imported.map(normalizeAssignment);
    saveAssignments();
    clearForm();
    render();
  } catch (error) {
    alert("That file was not a valid Lakeland assignment export.");
  } finally {
    els.importFile.value = "";
  }
});

function loadAssignments() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved.map(normalizeAssignment);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return structuredClone(starterAssignments);
}

function normalizeAssignment(item) {
  return {
    id: item.id || `assignment-${crypto.randomUUID()}`,
    title: item.title || "Untitled assignment",
    course: item.course || "Unassigned",
    due: item.due || "",
    priority: ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Medium",
    status: ["Not Started", "In Progress", "Done"].includes(item.status) ? item.status : "Not Started",
    notes: item.notes || "",
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function saveAssignments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.assignments));
}

function render() {
  populateCourseControls();
  renderMetrics();
  renderViewLabels();

  const filtered = getFilteredAssignments();
  els.list.replaceChildren();
  els.empty.hidden = filtered.length > 0;

  filtered.forEach((assignment) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const timing = getTiming(assignment.due, assignment.status);
    node.classList.toggle("overdue", timing.kind === "overdue");
    node.classList.toggle("soon", timing.kind === "soon");
    node.classList.toggle("done-card", assignment.status === "Done");
    node.querySelector(".course").textContent = assignment.course;
    node.querySelector(".due-pill").textContent = timing.label;
    node.querySelector("h3").textContent = assignment.title;
    node.querySelector(".notes").textContent = assignment.notes || "No notes yet.";

    const statusChip = node.querySelector(".status-chip");
    statusChip.textContent = assignment.status;
    statusChip.classList.toggle("status-done", assignment.status === "Done");
    statusChip.classList.toggle("status-progress", assignment.status === "In Progress");

    const priorityChip = node.querySelector(".priority-chip");
    priorityChip.textContent = `${assignment.priority} priority`;
    priorityChip.classList.add(`priority-${assignment.priority.toLowerCase()}`);

    const completeButton = node.querySelector(".complete-button");
    completeButton.classList.toggle("done", assignment.status === "Done");
    completeButton.addEventListener("click", () => toggleDone(assignment.id));

    node.querySelector(".edit-button").addEventListener("click", () => editAssignment(assignment.id));
    node.querySelector(".delete-button").addEventListener("click", () => deleteAssignment(assignment.id));
    els.list.append(node);
  });
}

function populateCourseControls() {
  const courses = [...new Set(state.assignments.map((item) => item.course).filter(Boolean))].sort();
  const currentFilter = els.courseFilter.value || "all";

  els.courseFilter.replaceChildren(new Option("All classes", "all"));
  courses.forEach((course) => els.courseFilter.add(new Option(course, course)));
  els.courseFilter.value = courses.includes(currentFilter) ? currentFilter : "all";

  els.courseOptions.replaceChildren();
  courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course;
    els.courseOptions.append(option);
  });
}

function renderMetrics() {
  const total = state.assignments.length;
  const done = state.assignments.filter((item) => item.status === "Done").length;
  const dueSoon = state.assignments.filter((item) => {
    const timing = getTiming(item.due, item.status);
    return timing.kind === "today" || timing.kind === "soon" || timing.kind === "overdue";
  }).length;

  els.metricTotal.textContent = total;
  els.metricDueSoon.textContent = dueSoon;
  els.metricDone.textContent = total ? `${Math.round((done / total) * 100)}%` : "0%";
}

function renderViewLabels() {
  const titles = {
    all: ["All assignments", "Sorted by due date, then priority."],
    today: ["Due today", "Only assignments due today."],
    week: ["This week", "Assignments due in the next seven days."],
    overdue: ["Overdue", "Unfinished assignments past their due date."],
  };
  const [title, subtitle] = titles[state.view];
  els.viewTitle.textContent = title;
  els.viewSubtitle.textContent = subtitle;
}

function getFilteredAssignments() {
  const search = els.searchInput.value.trim().toLowerCase();
  const course = els.courseFilter.value;
  const status = els.statusFilter.value;

  return state.assignments
    .filter((item) => {
      const haystack = `${item.title} ${item.course} ${item.notes}`.toLowerCase();
      if (search && !haystack.includes(search)) return false;
      if (course !== "all" && item.course !== course) return false;
      if (status !== "all" && item.status !== status) return false;
      return matchesView(item);
    })
    .sort(sortAssignments);
}

function matchesView(item) {
  const timing = getTiming(item.due, item.status);
  if (state.view === "today") return timing.kind === "today";
  if (state.view === "week") return ["today", "soon"].includes(timing.kind);
  if (state.view === "overdue") return timing.kind === "overdue";
  return true;
}

function sortAssignments(a, b) {
  const dueA = a.due || "9999-12-31";
  const dueB = b.due || "9999-12-31";
  if (dueA !== dueB) return dueA.localeCompare(dueB);
  return priorityRank(a.priority) - priorityRank(b.priority);
}

function priorityRank(priority) {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 1;
}

function getTiming(due, status) {
  if (status === "Done") return { kind: "done", label: due ? `Completed: ${formatDate(due)}` : "Completed" };
  if (!due) return { kind: "none", label: "No due date" };

  const today = startOfDay(new Date());
  const target = startOfDay(new Date(`${due}T00:00:00`));
  const days = Math.round((target - today) / 86400000);

  if (days < 0) return { kind: "overdue", label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue` };
  if (days === 0) return { kind: "today", label: "Due today" };
  if (days <= 7) return { kind: "soon", label: `Due in ${days} day${days === 1 ? "" : "s"}` };
  return { kind: "later", label: `Due ${formatDate(due)}` };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function toggleDone(id) {
  state.assignments = state.assignments.map((item) => {
    if (item.id !== id) return item;
    return { ...item, status: item.status === "Done" ? "In Progress" : "Done" };
  });
  saveAssignments();
  render();
}

function editAssignment(id) {
  const assignment = findAssignment(id);
  if (!assignment) return;
  els.assignmentId.value = assignment.id;
  els.titleInput.value = assignment.title;
  els.courseInput.value = assignment.course;
  els.dueInput.value = assignment.due;
  els.priorityInput.value = assignment.priority;
  els.statusInput.value = assignment.status;
  els.notesInput.value = assignment.notes;
  els.titleInput.focus();
}

function deleteAssignment(id) {
  const assignment = findAssignment(id);
  if (!assignment || !confirm(`Delete "${assignment.title}"?`)) return;
  state.assignments = state.assignments.filter((item) => item.id !== id);
  saveAssignments();
  render();
}

function findAssignment(id) {
  return state.assignments.find((item) => item.id === id);
}

function clearForm() {
  els.form.reset();
  els.assignmentId.value = "";
  els.priorityInput.value = "Medium";
  els.statusInput.value = "Not Started";
}

render();
