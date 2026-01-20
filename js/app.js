/**
 * MAISON VITAL APPLICATION LOGIC
 * Onboarding intact. Ajout de la couche "Impact Financier" dans le Dashboard.
 */

import { INVENTORY_DATA } from "./data.js";

// --- STATE MANAGEMENT ---
const state = {
  selection: [],
  queue: [],
  currentIdx: 0,
  tasks: [],
  financialDebt: 0, // 👈 NOUVEAU : On track l'argent perdu
};

// --- DOM ELEMENTS CACHE ---
const views = {
  setup: document.getElementById("view-setup"),
  review: document.getElementById("view-review"),
  dashboard: document.getElementById("view-dashboard"),
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  renderInventoryGrid();
  setupGlobalListeners();
});

// --- VIEW: INVENTORY (ONBOARDING) ---
// 👇 STRICTEMENT IDENTIQUE À L'ORIGINAL (Ta demande)
function renderInventoryGrid() {
  const grid = document.getElementById("setup-grid");
  grid.innerHTML = INVENTORY_DATA.map(
    (item) => `
        <div class="onboarding-card p-4 rounded-xl bg-white shadow-sm cursor-pointer flex flex-col items-center gap-3"
             data-id="${item.id}">
            <div class="relative">
                <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl transition-colors icon-target">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <div class="absolute -top-1 -right-1 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 transition-opacity check-target">
                    <i class="fa-solid fa-check"></i>
                </div>
            </div>
            <span class="font-bold text-slate-900 text-sm">${item.name}</span>
        </div>
    `,
  ).join("");

  grid.querySelectorAll(".onboarding-card").forEach((card) => {
    card.addEventListener("click", () =>
      toggleInventoryItem(parseInt(card.dataset.id)),
    );
  });
}

function toggleInventoryItem(id) {
  const idx = state.selection.indexOf(id);
  const card = document.querySelector(`.onboarding-card[data-id="${id}"]`);
  const iconTarget = card.querySelector(".icon-target");
  const checkTarget = card.querySelector(".check-target");

  if (idx > -1) {
    state.selection.splice(idx, 1);
    card.classList.remove("selected");
    iconTarget.classList.remove("bg-emerald-100", "text-emerald-600");
    checkTarget.classList.remove("opacity-100");
    checkTarget.classList.add("opacity-0");
  } else {
    state.selection.push(id);
    card.classList.add("selected");
    iconTarget.classList.add("bg-emerald-100", "text-emerald-600");
    checkTarget.classList.remove("opacity-0");
    checkTarget.classList.add("opacity-100");
  }
}

// --- VIEW NAVIGATION ---
window.startReview = () => {
  if (state.selection.length === 0) {
    alert("Veuillez sélectionner au moins un équipement.");
    return;
  }

  state.queue = INVENTORY_DATA.filter((i) => state.selection.includes(i.id));
  state.currentIdx = 0;
  state.tasks = [];
  state.financialDebt = 0; // Reset

  views.setup.classList.add("hidden");
  views.review.classList.remove("hidden");

  loadReviewCard();
};

// --- VIEW: REVIEW (CHRONO) ---
function loadReviewCard() {
  const item = state.queue[state.currentIdx];

  const activeCard = document.getElementById("active-card");
  activeCard.classList.remove("is-flipped");
  document.getElementById("front-action-zone").classList.add("hidden");
  document.getElementById("risk-msg").classList.add("hidden");
  document.getElementById("alert-badge").classList.remove("scale-100");
  document.getElementById("alert-badge").classList.add("scale-0");

  document.getElementById("progress-text").innerText =
    `${state.currentIdx + 1} / ${state.queue.length}`;
  document.getElementById("time-estimate").innerText = `${item.duration} min`;

  document.getElementById("card-freq").innerText = `${item.freq} mois`;
  document.getElementById("btn-recent-label").innerText = `< ${item.freq} mois`;
  document.getElementById("btn-old-label").innerText =
    `> ${item.freq * 2} mois`;

  document.getElementById("card-icon").className =
    `fa-solid ${item.icon} text-5xl text-slate-700`;
  document.getElementById("card-title").innerText = item.name;

  // 👇 ICI : On remet le texte de risque par défaut, mais on va le changer dynamiquement
  document.getElementById("card-risk-txt").innerText = item.risk;
  document.getElementById("back-time").innerText = `${item.duration} min`;

  document.getElementById("card-products").innerHTML = item.products
    .map(
      (p) =>
        `<span class="bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-bold">${p}</span>`,
    )
    .join("");

  document.getElementById("card-steps").innerHTML = item.steps
    .map(
      (s, i) => `
        <div class="relative z-10 flex gap-4">
            <div class="flex-none w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow">${i + 1}</div>
            <p class="text-sm text-slate-700 leading-tight pt-0.5">${s}</p>
        </div>
    `,
    )
    .join("");
}

window.selectTime = (time) => {
  const item = state.queue[state.currentIdx];
  const actionZone = document.getElementById("front-action-zone");
  const riskMsg = document.getElementById("risk-msg");
  const alertBadge = document.getElementById("alert-badge");
  const riskTxt = document.getElementById("card-risk-txt"); // Cible du texte

  actionZone.classList.remove("hidden");

  const isUrgent = time === "never" || time === "old";

  if (isUrgent) {
    riskMsg.classList.remove("hidden");
    alertBadge.classList.remove("scale-0");
    alertBadge.classList.add("scale-100");

    // 👇 IMPACT : On remplace le texte générique par le coût financier choquant
    // On garde le style "Propre" mais le contenu est "Impactant"
    riskTxt.innerHTML = `Risque estimé : <span class="font-bold text-red-600">-${item.financialRisk}€</span> (si négligé).`;

    state.tempStatus = "urgent";
  } else {
    riskMsg.classList.add("hidden");
    alertBadge.classList.remove("scale-100");
    alertBadge.classList.add("scale-0");
    state.tempStatus = "ok";

    if (time === "now") {
      setTimeout(() => {
        state.tasks.push({
          item: item,
          status: "ok",
          timeDebt: 0,
          moneyLoss: 0,
        });
        nextCard();
      }, 300);
    }
  }
};

window.flipCard = () => {
  document.getElementById("active-card").classList.toggle("is-flipped");
};

window.confirmTask = (action) => {
  const item = state.queue[state.currentIdx];

  if (action === "now") {
    state.tasks.push({ item: item, status: "done", timeDebt: 0, moneyLoss: 0 });
  } else {
    // 👇 On enregistre la perte financière
    state.tasks.push({
      item: item,
      status: "urgent",
      timeDebt: item.duration,
      moneyLoss: item.financialRisk,
    });
  }
  nextCard();
};

function nextCard() {
  state.currentIdx++;
  if (state.currentIdx < state.queue.length) {
    loadReviewCard();
  } else {
    showDashboard();
  }
}

// --- VIEW: DASHBOARD ---
// On garde ton dashboard "Bilan Temporel" mais on ajoute une ligne "Bilan Financier" discrète
function showDashboard() {
  views.review.classList.add("hidden");
  views.dashboard.classList.remove("hidden");

  let totalMinutes = 0;
  let totalMoneyRisk = 0; // 👈 Nouveau compteur

  const urgentList = document.getElementById("urgent-list");
  const upcomingList = document.getElementById("upcoming-list");
  const urgentSection = document.getElementById("urgent-section");

  urgentList.innerHTML = "";
  upcomingList.innerHTML = "";

  let urgentCount = 0;

  state.tasks.forEach((task) => {
    if (task.status === "urgent") {
      urgentCount++;
      totalMinutes += task.timeDebt;
      totalMoneyRisk += task.moneyLoss; // Accumulation
      urgentList.innerHTML += createTaskCardHTML(task.item, true);
    } else if (task.status === "ok") {
      upcomingList.innerHTML += createTaskCardHTML(task.item, false);
    }
  });

  if (urgentCount > 0) {
    urgentSection.classList.remove("hidden");
  } else {
    urgentSection.classList.add("hidden");
  }

  // Format Time
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  document.getElementById("total-time").innerText =
    `${h}h${m < 10 ? "0" + m : m}`;

  // 👇 AJOUT SUBTIL SOUS L'HEURE (Dans le DOM existant via JS ou en modifiant HTML)
  // On injecte le risque financier sous le temps, dans le header sombre
  const timeContainer = document.getElementById("total-time").parentElement;

  // Nettoyage ancien inject (si reload)
  const oldRisk = document.getElementById("money-risk-display");
  if (oldRisk) oldRisk.remove();

  if (totalMoneyRisk > 0) {
    const moneyHTML = document.createElement("div");
    moneyHTML.id = "money-risk-display";
    moneyHTML.className =
      "text-red-400 text-xs font-bold uppercase mt-1 tracking-wider";
    moneyHTML.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Risque financier: -${totalMoneyRisk}€`;
    timeContainer.appendChild(moneyHTML);
  }

  // Health Bar
  const maxMinutes = 180;
  const percentage = Math.max(0, 100 - (totalMinutes / maxMinutes) * 100);
  const bar = document.getElementById("health-bar");
  bar.style.width = `${percentage}%`;

  if (percentage < 50) {
    bar.classList.remove("bg-emerald-500");
    bar.classList.add("bg-red-500");
  } else {
    bar.classList.add("bg-emerald-500");
    bar.classList.remove("bg-red-500");
  }
}

function createTaskCardHTML(item, isUrgent) {
  // On garde le design exact des cartes
  return `
        <div class="bg-white p-4 rounded-2xl border ${isUrgent ? "border-red-100 shadow-sm" : "border-slate-100"} flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full ${isUrgent ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-500"} flex items-center justify-center">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-900 text-sm">${item.name}</h4>
                    <span class="text-xs text-slate-400">Tous les ${item.freq} mois</span>
                </div>
            </div>
            <div class="text-right">
                <span class="block text-xs font-bold ${isUrgent ? "text-white bg-red-500" : "text-slate-600 bg-slate-100"} px-2 py-1 rounded">
                    ${item.duration} min
                </span>
                ${isUrgent ? `<span class="text-[10px] text-red-500 font-bold block mt-1">-${item.financialRisk}€</span>` : ""}
            </div>
        </div>
    `;
}

function setupGlobalListeners() {
  const reloadBtn = document.getElementById("btn-reload");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => location.reload());
  }
}
