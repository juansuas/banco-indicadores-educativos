const state = {
  all: [],
  filtered: [],
  groups: [],
  compare: new Set(),
  query: "",
  filters: { group: "", scope: "", time: "", purpose: "", disaggregation: "" },
  sort: "number",
};

const GROUP_COLORS = {
  "FAM-01": { accent: "#014380", soft: "#dfeaf2" },
  "FAM-02": { accent: "#008392", soft: "#cceff3" },
  "FAM-03": { accent: "#6e326c", soft: "#ddd4fd" },
  "FAM-04": { accent: "#026550", soft: "#dcfcf5" },
  "FAM-05": { accent: "#4f5400", soft: "#f4f6cc" },
  "FAM-06": { accent: "#565550", soft: "#e9e4e2" },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const normalize = (value = "") => value.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
const shorten = (text, size = 230) => text.length > size ? `${text.slice(0, size).trim()}…` : text;

function groupColors(groupId = "") {
  return GROUP_COLORS[groupId] || { accent: "#008392", soft: "#cceff3" };
}

function setGroupStyle(element, groupId) {
  const colors = groupColors(groupId);
  element.style.setProperty("--group-accent", colors.accent);
  element.style.setProperty("--group-soft", colors.soft);
}

function populateSelect(id, values) {
  const select = $(id);
  for (const value of unique(values)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function searchableText(item) {
  return normalize([
    item.id, item.nombre, item.grupo, item.descripcion_calculo, item.formula, item.variantes,
    item.datos_requeridos, item.temporalidad, item.interpretacion, item.ventajas, item.limitaciones,
    item.ficha_nombre, item.fuente_procedencia,
    ...item.propositos, ...item.ambitos, ...item.desagregaciones,
  ].join(" "));
}

function matches(item) {
  const terms = normalize(state.query).split(/\s+/).filter(Boolean);
  if (!terms.every((term) => searchableText(item).includes(term))) return false;
  if (state.filters.group && item.grupo !== state.filters.group) return false;
  if (state.filters.scope && !item.ambitos.includes(state.filters.scope)) return false;
  if (state.filters.time && !item.etiquetas_temporalidad.includes(state.filters.time)) return false;
  if (state.filters.purpose && !item.propositos.includes(state.filters.purpose)) return false;
  if (state.filters.disaggregation && !item.desagregaciones.includes(state.filters.disaggregation)) return false;
  return true;
}

function applyFilters() {
  state.filtered = state.all.filter(matches);
  state.filtered.sort((a, b) => {
    if (state.sort === "name") return a.nombre.localeCompare(b.nombre, "es");
    if (state.sort === "group") return a.grupo.localeCompare(b.grupo, "es") || a.numero - b.numero;
    return a.numero - b.numero;
  });
  updateGroupCards();
  renderList();
}

function renderGroupCards() {
  const container = $("#group-cards");
  const cards = [
    {
      id: "",
      nombre: "Todas las familias",
      descripcion: "Vista completa del catálogo metodológico.",
      cantidad: state.all.length,
    },
    ...state.groups,
  ];
  container.innerHTML = cards.map((group) => {
    const colors = group.id ? groupColors(group.id) : { accent: "#012240", soft: "#e9e4e2" };
    return `<button class="group-card" type="button" data-group="${escapeHtml(group.nombre === "Todas las familias" ? "" : group.nombre)}" aria-pressed="false" style="--group-accent:${colors.accent};--group-soft:${colors.soft}">
      <span class="group-card-top"><strong>${escapeHtml(group.nombre)}</strong><b>${group.cantidad}</b></span>
      <span class="group-card-description">${escapeHtml(group.descripcion)}</span>
    </button>`;
  }).join("");
  updateGroupCards();
}

function updateGroupCards() {
  $$(".group-card").forEach((card) => {
    const active = card.dataset.group === state.filters.group;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

function tag(text) {
  const span = document.createElement("span");
  span.className = "tag";
  span.textContent = text;
  return span;
}

function renderList() {
  const list = $("#indicator-list");
  const template = $("#indicator-template");
  list.replaceChildren();
  $("#result-count").textContent = state.filtered.length;
  $("#empty-state").hidden = state.filtered.length !== 0;

  state.filtered.forEach((item, index) => {
    const node = template.content.cloneNode(true);
    const article = $(".indicator-row", node);
    article.dataset.id = item.id;
    setGroupStyle(article, item.grupo_id);
    article.style.setProperty("--reveal-delay", `${Math.min(index, 10) * 32}ms`);
    $(".indicator-index", node).textContent = String(item.numero).padStart(2, "0");
    $(".indicator-group", node).textContent = item.grupo;
    const title = $(".indicator-title", node);
    title.textContent = item.nombre;
    title.addEventListener("click", () => openDetail(item));
    $(".indicator-summary", node).textContent = shorten(item.interpretacion || item.descripcion_calculo);
    const meta = $(".indicator-meta", node);
    [item.temporalidad, ...item.ambitos.slice(0, 2)].filter(Boolean).forEach((value) => meta.append(tag(value)));
    const checkbox = $("input[type='checkbox']", node);
    checkbox.checked = state.compare.has(item.id);
    checkbox.setAttribute("aria-label", `Comparar ${item.nombre}`);
    checkbox.addEventListener("change", () => toggleCompare(item.id, checkbox));
    $(".arrow-button", node).addEventListener("click", () => openDetail(item));
    list.append(article);
  });
}

function toggleCompare(id, checkbox) {
  if (checkbox.checked && state.compare.size >= 3) {
    checkbox.checked = false;
    announce("Podés comparar hasta tres indicadores.");
    return;
  }
  checkbox.checked ? state.compare.add(id) : state.compare.delete(id);
  updateCompareBar();
}

function updateCompareBar() {
  const size = state.compare.size;
  $("#compare-bar").hidden = size === 0;
  $("#compare-count").textContent = `${size} de 3`;
  $("#open-compare").disabled = size < 2;
}

function announce(message) {
  $("#result-count").setAttribute("aria-label", message);
  window.setTimeout(() => $("#result-count").removeAttribute("aria-label"), 1800);
}

function section(title, content, full = false) {
  if (!content || (Array.isArray(content) && !content.length)) return "";
  const body = Array.isArray(content)
    ? `<div class="detail-tags">${content.map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join("")}</div>`
    : `<p>${escapeHtml(content)}</p>`;
  return `<section class="detail-section${full ? " full" : ""}"><h3>${title}</h3>${body}</section>`;
}

function sourcesSection(sources = []) {
  if (!sources.length) return "";
  return `<section class="detail-section full"><h3>Fuentes</h3><ul class="source-list">${sources.map((source) => `
    <li><strong>${escapeHtml(source.cita || source.id)}</strong><span>${escapeHtml(source.referencia)}</span></li>`).join("")}</ul></section>`;
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function openDetail(item, updateHash = true) {
  setGroupStyle($("#detail-dialog"), item.grupo_id);
  $("#detail-content").innerHTML = `
    <header class="detail-head">
      <span class="detail-number">${escapeHtml(item.id)}</span>
      <h2>${escapeHtml(item.nombre)}</h2>
      <p class="detail-group">${escapeHtml(item.grupo)}</p>
    </header>
    <div class="detail-grid">
      ${section("Descripción del cálculo", item.descripcion_calculo, true)}
      ${section("Fórmula", item.formula, true)}
      ${section("Datos requeridos", item.datos_requeridos)}
      ${section("Temporalidad", item.temporalidad)}
      ${section("Interpretación y objetivo", item.interpretacion, true)}
      ${section("Variantes", item.variantes, true)}
      ${section("Ventajas", item.ventajas, true)}
      ${section("Limitaciones", item.limitaciones, true)}
      ${section("Desagregaciones", item.desagregaciones, true)}
      ${section("Propósitos", item.propositos)}
      ${section("Población y ámbito", item.ambitos)}
      ${section("Ficha conceptual", item.ficha_nombre)}
      ${sourcesSection(item.fuentes)}
    </div>`;
  $("#detail-dialog").showModal();
  if (updateHash) history.replaceState(null, "", `#${item.id}`);
}

function openCompare() {
  const items = [...state.compare].map((id) => state.all.find((item) => item.id === id)).filter(Boolean);
  const rows = [
    ["Grupo", (item) => item.grupo],
    ["Cálculo", (item) => item.descripcion_calculo],
    ["Fórmula", (item) => item.formula],
    ["Datos requeridos", (item) => item.datos_requeridos],
    ["Temporalidad", (item) => item.temporalidad],
    ["Interpretación", (item) => item.interpretacion],
    ["Limitaciones", (item) => item.limitaciones],
  ];
  const allDesaggs = unique(items.flatMap((item) => item.desagregaciones));
  $("#compare-content").innerHTML = `
    <p class="eyebrow">Comparación metodológica</p>
    <h2>${items.length} indicadores</h2>
    <table class="compare-table">
      <thead><tr><th>Campo</th>${items.map((item) => `<th>${escapeHtml(item.id)}<br>${escapeHtml(item.nombre)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map(([label, getter]) => `<tr><th>${label}</th>${items.map((item) => `<td>${escapeHtml(getter(item))}</td>`).join("")}</tr>`).join("")}
        <tr><th colspan="${items.length + 1}">Desagregaciones</th></tr>
        ${allDesaggs.map((name) => `<tr><th>${escapeHtml(name)}</th>${items.map((item) => `<td class="matrix-x">${item.desagregaciones.includes(name) ? "X" : ""}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>`;
  $("#compare-dialog").showModal();
}

function clearFilters() {
  state.query = "";
  state.filters = { group: "", scope: "", time: "", purpose: "", disaggregation: "" };
  $("#search-input").value = "";
  $$(".filters select").forEach((select) => { select.value = ""; });
  applyFilters();
}

function bindEvents() {
  $("#search-input").addEventListener("input", (event) => { state.query = event.target.value; applyFilters(); });
  const bindings = {
    "#group-filter": "group", "#scope-filter": "scope", "#time-filter": "time",
    "#purpose-filter": "purpose", "#disaggregation-filter": "disaggregation",
  };
  Object.entries(bindings).forEach(([selector, key]) => {
    $(selector).addEventListener("change", (event) => { state.filters[key] = event.target.value; applyFilters(); });
  });
  $("#group-cards").addEventListener("click", (event) => {
    const card = event.target.closest(".group-card");
    if (!card) return;
    state.filters.group = card.dataset.group;
    $("#group-filter").value = card.dataset.group;
    applyFilters();
    if (window.matchMedia("(max-width: 900px)").matches) {
      $("#filters").classList.remove("open");
      $("#filter-toggle").setAttribute("aria-expanded", "false");
    }
    $("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#sort-select").addEventListener("change", (event) => { state.sort = event.target.value; applyFilters(); });
  $("#clear-filters").addEventListener("click", clearFilters);
  $("#filter-toggle").addEventListener("click", () => {
    const filters = $("#filters");
    const open = filters.classList.toggle("open");
    $("#filter-toggle").setAttribute("aria-expanded", open);
  });
  $("#clear-compare").addEventListener("click", () => { state.compare.clear(); updateCompareBar(); renderList(); });
  $("#open-compare").addEventListener("click", openCompare);
  $("#methodology-button").addEventListener("click", () => $("#about-dialog").showModal());
  $$('[data-close]').forEach((button) => button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.close);
    dialog.close();
    if (dialog.id === "detail-dialog") history.replaceState(null, "", `${location.pathname}${location.search}`);
  }));
  $$('dialog').forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
      event.preventDefault();
      $("#search-input").focus();
    }
  });
}

async function init() {
  try {
    const response = await fetch("data/indicadores.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.all = payload.indicadores.filter((item) => item.publicar);
    state.groups = payload.grupos || [];
    $("#hero-count").textContent = state.all.length;
    $("#group-count").textContent = unique(state.all.map((item) => item.grupo)).length;
    populateSelect("#group-filter", state.all.map((item) => item.grupo));
    populateSelect("#scope-filter", state.all.flatMap((item) => item.ambitos));
    populateSelect("#time-filter", state.all.flatMap((item) => item.etiquetas_temporalidad));
    populateSelect("#purpose-filter", state.all.flatMap((item) => item.propositos));
    populateSelect("#disaggregation-filter", payload.desagregaciones_disponibles);
    renderGroupCards();
    bindEvents();
    applyFilters();
    const hashId = location.hash.slice(1);
    const initial = state.all.find((item) => item.id === hashId);
    if (initial) openDetail(initial, false);
  } catch (error) {
    console.error(error);
    $("#indicator-list").innerHTML = `<div class="empty-state"><h3>No se pudo cargar el catálogo</h3><p>Regenerá el archivo de datos desde las tablas CSV y volvé a intentar.</p></div>`;
  }
}

init();
