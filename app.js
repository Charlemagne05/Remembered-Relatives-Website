const STORAGE_KEY = "remembered_relatives_v1";

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadRelatives() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveRelatives(relatives) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(relatives));
}

function createRelativeCard(relative) {
  const card = document.createElement("article");
  card.className = "relative-card";

  const top = document.createElement("div");
  top.className = "relative-top";

  const left = document.createElement("div");

  const name = document.createElement("h3");
  name.className = "relative-name";
  name.textContent = relative.name;

  const meta = document.createElement("div");
  meta.className = "relative-meta";
  meta.textContent = relative.relation + (relative.years ? ` • ${relative.years}` : "");

  left.appendChild(name);
  left.appendChild(meta);

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = "Souvenir";

  top.appendChild(left);
  top.appendChild(badge);

  card.appendChild(top);

  if (relative.memory) {
    const memory = document.createElement("p");
    memory.className = "relative-memory";
    memory.textContent = relative.memory;
    card.appendChild(memory);
  }

  return card;
}

function render(relatives, elements) {
  const { listEl, emptyStateEl, countEl } = elements;

  listEl.innerHTML = "";
  countEl.textContent = String(relatives.length);

  if (relatives.length === 0) {
    emptyStateEl.hidden = false;
    return;
  }

  emptyStateEl.hidden = true;
  for (const relative of relatives) {
    listEl.appendChild(createRelativeCard(relative));
  }
}

function getDefaultRelatives() {
  return [
    {
      id: makeId(),
      name: "Marie Dupont",
      relation: "Grand-mère",
      years: "1940–2015",
      memory: "Toujours une histoire à raconter et un sourire rassurant.",
      createdAt: new Date().toISOString(),
    },
    {
      id: makeId(),
      name: "Paul Martin",
      relation: "Oncle",
      years: "",
      memory: "Le roi des blagues au repas de famille.",
      createdAt: new Date().toISOString(),
    },
  ];
}

function init() {
  const elements = {
    listEl: document.getElementById("relativesList"),
    emptyStateEl: document.getElementById("emptyState"),
    countEl: document.getElementById("relativesCount"),
    formEl: document.getElementById("relativeForm"),
    nameInput: document.getElementById("nameInput"),
    relationInput: document.getElementById("relationInput"),
    yearsInput: document.getElementById("yearsInput"),
    memoryInput: document.getElementById("memoryInput"),
    clearButton: document.getElementById("clearButton"),
  };

  if (!elements.listEl || !elements.formEl) return;

  let relatives = loadRelatives();
  if (!relatives) {
    relatives = getDefaultRelatives();
    saveRelatives(relatives);
  }

  render(relatives, elements);

  elements.formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = elements.nameInput.value.trim();
    const relation = elements.relationInput.value.trim();
    const years = elements.yearsInput.value.trim();
    const memory = elements.memoryInput.value.trim();

    if (!name || !relation) return;

    relatives.unshift({
      id: makeId(),
      name,
      relation,
      years,
      memory,
      createdAt: new Date().toISOString(),
    });

    saveRelatives(relatives);
    render(relatives, elements);
    elements.formEl.reset();
    elements.nameInput.focus();
  });

  elements.clearButton?.addEventListener("click", () => {
    const ok = window.confirm("Effacer toutes les entrées sauvegardées sur cet appareil ?");
    if (!ok) return;
    relatives = [];
    localStorage.removeItem(STORAGE_KEY);
    render(relatives, elements);
  });
}

init();
