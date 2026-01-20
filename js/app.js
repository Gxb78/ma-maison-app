/**
 * MAISON VITAL LOGIC CORE v2.1
 * Architecture: State Store -> Optimistic UI -> Persistence -> Gamification Engine
 */

import { INVENTORY } from "./data.js";
import * as Game from "./gamification.js";

class MaisonApp {
  constructor() {
    // --- STATE INITIAL (Single Source of Truth) ---
    this.state = {
      inventory: [], // Liste des IDs d'équipements sélectionnés
      tasks: {}, // Map: assetId -> { lastDone: ISOString, status: 'ok'|'urgent' }
      // Note: Les stats utilisateur (xp, level, health) sont gérées par Game (gamification.js)
      // mais on les sauvegarde ici pour la persistance.

      // Runtime state (non-persisted)
      reviewQueue: [],
      currentCardIdx: 0,
      isReviewing: false,
    };

    // --- CACHE DOM ---
    this.dom = {
      setupGrid: document.getElementById("setup-grid"),
      views: {
        setup: document.getElementById("view-setup"),
        review: document.getElementById("view-review"),
        dashboard: document.getElementById("view-dashboard"),
      },
      card: {
        container: document.getElementById("active-card"),
        title: document.getElementById("card-title"),
        icon: document.getElementById("card-icon"),
        tutorial: document.getElementById("card-tutorial"),
        products: document.getElementById("card-products"),
        duration: document.getElementById("card-duration"),
      },
      dash: {
        urgent: document.getElementById("urgent-list"), // Corrigé ID selon index.html supposé ou précédent
        upcoming: document.getElementById("upcoming-list"), // Corrigé ID
        scoreDisplay: document.getElementById("health-score-display"),
        ring: document.getElementById("health-ring"),
        statusText: document.getElementById("health-status-text"),
        level: document.getElementById("level-display"),
        xpText: document.getElementById("xp-text"),
        xpBar: document.getElementById("xp-bar"),
        urgentSection: document.getElementById("urgent-section"),
        badgeContainer: document.getElementById("badge-container"),
        badgeCount: document.getElementById("badge-count"),
      },
      progress: {
        bar: document.getElementById("review-progress-bar"),
        text: document.getElementById("progress-text"),
      },
    };

    this.init();
  }

  init() {
    this.loadState();
    this.renderInventory();

    // Si l'utilisateur a déjà un inventaire, on va direct au dashboard
    // sauf s'il n'a jamais fini l'onboarding
    if (
      this.state.inventory.length > 0 &&
      Object.keys(this.state.tasks).length > 0
    ) {
      this.recalcHealthStatus(); // Vérifier si le temps a passé
      this.switchView("dashboard");
      this.renderDashboard();
    } else {
      // Premier lancement ou reset
      this.switchView("setup");
    }
  }

  // --- PERSISTENCE LAYER ---
  saveState() {
    // On récupère les stats actuelles du moteur de jeu
    const gameStats = Game.getStats();

    const persist = {
      inventory: this.state.inventory,
      tasks: this.state.tasks,
      // On sauvegarde l'état du jeu pour le recharger plus tard
      userGameStats: {
        xp: gameStats.xp,
        level: gameStats.level,
        unlockedBadges: gameStats.unlockedBadges,
        totalTasksCompleted: gameStats.totalTasksCompleted,
      },
    };
    localStorage.setItem("maison_state", JSON.stringify(persist));
  }

  loadState() {
    const stored = localStorage.getItem("maison_state");
    if (stored) {
      const parsed = JSON.parse(stored);
      this.state.inventory = parsed.inventory || [];
      this.state.tasks = parsed.tasks || {};

      // Réhydratation du moteur de Gamification
      // Hack: On modifie directement l'objet stats de Game car il n'a pas de setter public
      if (parsed.userGameStats) {
        const currentStats = Game.getStats();
        currentStats.xp = parsed.userGameStats.xp || 0;
        currentStats.level = parsed.userGameStats.level || 1;
        currentStats.unlockedBadges = parsed.userGameStats.unlockedBadges || [];
        currentStats.totalTasksCompleted =
          parsed.userGameStats.totalTasksCompleted || 0;
      }
    }
  }

  resetData() {
    if (
      confirm(
        "Attention : Voulez-vous réinitialiser toutes les données et recommencer?",
      )
    ) {
      localStorage.clear();
      location.reload();
    }
  }

  // --- ROUTER / NAVIGATION ---
  switchView(viewName) {
    // Masquer toutes les vues
    Object.values(this.dom.views).forEach((el) => {
      if (!el) return;
      el.classList.add("hidden");
      // Reset transforms for cleanliness
      if (viewName !== "review")
        el.classList.remove("translate-x-0", "translate-x-full");
    });

    const target = this.dom.views[viewName];
    if (target) {
      target.classList.remove("hidden");

      // Animation simple
      if (viewName === "review") {
        target.classList.remove("translate-x-full");
        target.classList.add("translate-x-0");
      } else {
        target.classList.add("translate-x-0");
      }
    }
  }

  // --- VUE 1 : INVENTAIRE ---
  renderInventory() {
    if (!this.dom.setupGrid) return;

    this.dom.setupGrid.innerHTML = INVENTORY.map((item) => {
      const isSelected = this.state.inventory.includes(item.id);
      return `
                <div onclick="app.toggleAsset('${item.id}')" 
                     class="inventory-card p-4 rounded-2xl bg-white border-2 ${isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-100"} shadow-sm cursor-pointer flex flex-col items-center gap-3 relative h-36 justify-center transition-all active:scale-95">
                    <div class="w-12 h-12 rounded-full ${isSelected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"} flex items-center justify-center text-xl transition-colors">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <span class="font-bold ${isSelected ? "text-emerald-900" : "text-slate-700"} text-xs text-center leading-tight px-1">${item.name}</span>
                    ${isSelected ? '<div class="absolute top-2 right-2 text-emerald-500 fade-in"><i class="fa-solid fa-circle-check"></i></div>' : ""}
                </div>
            `;
    }).join("");
  }

  toggleAsset(id) {
    const idx = this.state.inventory.indexOf(id);
    if (idx > -1) {
      this.state.inventory.splice(idx, 1);
      // Si on retire l'asset, on retire aussi ses tâches associées
      delete this.state.tasks[id];
    } else {
      this.state.inventory.push(id);
    }

    this.saveState();
    this.renderInventory(); // Re-render pour l'UI
  }

  // --- VUE 2 : DIAGNOSTIC (GAMIFIÉ) ---
  startReview() {
    if (this.state.inventory.length === 0) {
      alert("Veuillez sélectionner au moins un équipement pour votre maison.");
      return;
    }

    // On construit la file d'attente.
    this.state.reviewQueue = INVENTORY.filter((i) =>
      this.state.inventory.includes(i.id),
    );
    this.state.currentCardIdx = 0;
    this.state.isReviewing = true;

    this.switchView("review");
    this.loadCard();
  }

  loadCard() {
    const item = this.state.reviewQueue[this.state.currentCardIdx];

    // Fin de la queue ?
    if (!item) {
      this.finishReview();
      return;
    }

    // Reset UI Carte
    this.dom.card.container.classList.remove("rotate-y-180");

    // Injection Contenu
    this.dom.card.title.innerText = item.name;
    this.dom.card.duration.innerText = `${item.duration_minutes} min`;
    this.dom.card.icon.innerHTML = `<i class="fa-solid ${item.icon}"></i>`;

    // Ingrédients
    if (item.products) {
      this.dom.card.products.innerHTML = item.products
        .map(
          (p) =>
            `<span class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 uppercase tracking-wide">${p}</span>`,
        )
        .join("");
    }

    // Tutoriel
    if (item.steps) {
      this.dom.card.tutorial.innerHTML = item.steps
        .map(
          (step, i) => `
                <div class="flex gap-4 items-start">
                    <div class="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-none shadow-md mt-0.5">${i + 1}</div>
                    <p class="text-slate-300 leading-snug text-sm">${step}</p>
                </div>
            `,
        )
        .join("");
    }

    // Barre de Progression
    const progress =
      (this.state.currentCardIdx / this.state.reviewQueue.length) * 100;
    this.dom.progress.bar.style.width = `${progress}%`;
    this.dom.progress.text.innerText = `${this.state.currentCardIdx + 1} / ${this.state.reviewQueue.length}`;
  }

  flipCard() {
    this.dom.card.container.classList.toggle("rotate-y-180");
  }

  handleInput(action) {
    const item = this.state.reviewQueue[this.state.currentCardIdx];
    const now = new Date().toISOString();

    // Variables pour les effets
    let xpGained = 0;
    let leveledUp = false;
    let newBadges = [];

    if (action === "good") {
      // "C'est fait" (Nickel)
      this.state.tasks[item.id] = { lastDone: now, status: "ok" };

      // Petite récompense pour maintien (20 XP flat)
      const result = Game.addXP(20);
      xpGained = 20;
      leveledUp = result.leveledUp;
      newBadges = Game.checkBadges(item);
    } else if (action === "now") {
      // "Je le fais maintenant" via le tuto
      this.state.tasks[item.id] = { lastDone: now, status: "ok" };

      // Calcul complet via le moteur
      const taskXP = Game.calculateTaskXP(item);
      const result = Game.addXP(taskXP);

      xpGained = taskXP;
      leveledUp = result.leveledUp;
      newBadges = Game.checkBadges(item);

      // Confettis immédiats pour l'action
      this.triggerConfetti("success");
    } else {
      // "À faire / Jamais fait"
      // On met lastDone à null pour forcer l'urgence
      this.state.tasks[item.id] = { lastDone: null, status: "urgent" };
    }

    // Feedback Console (Debug)
    console.log(
      `Action: ${action} | XP: +${xpGained} | Badges: ${newBadges.length}`,
    );

    // Gestion des popups (Level Up / Badges) différée légèrement pour l'UX
    if (leveledUp) {
      setTimeout(() => {
        alert(
          `NIVEAU SUPÉRIEUR ! Vous êtes maintenant niveau ${Game.getStats().level}`,
        );
        this.triggerConfetti("levelup");
      }, 600);
    }
    if (newBadges.length > 0) {
      setTimeout(() => {
        const names = newBadges.map((b) => b.name).join(", ");
        alert(`BADGE DÉBLOQUÉ : ${names} !`);
      }, 800);
    }

    // Carte suivante
    this.state.currentCardIdx++;
    setTimeout(() => this.loadCard(), 300);
  }

  abortReview() {
    if (confirm("Quitter le diagnostic en cours ?")) {
      this.state.isReviewing = false;
      this.switchView("setup");
    }
  }

  finishReview() {
    this.state.isReviewing = false;
    this.recalcHealthStatus();
    this.saveState();
    this.switchView("dashboard");
    this.renderDashboard();
  }

  // --- LOGIQUE MÉTIER & CALCULS ---

  recalcHealthStatus() {
    const now = new Date();

    // Conversion de la Map tasks en tableau pour le moteur de jeu
    // On doit passer une liste d'objets { item, status }
    const taskListForGameEngine = [];

    this.state.inventory.forEach((id) => {
      let status = "urgent";
      const task = this.state.tasks[id];
      const item = INVENTORY.find((i) => i.id === id);

      if (task && task.lastDone) {
        const lastDate = new Date(task.lastDone);
        // Ajoute fréquence mois
        const dueDate = new Date(lastDate);
        dueDate.setMonth(dueDate.getMonth() + item.frequency_months);

        if (now > dueDate) {
          status = "late"; // En retard
        } else {
          status = "ok"; // À jour
        }
      } else {
        status = "urgent"; // Jamais fait
      }

      // Mise à jour locale
      if (!this.state.tasks[id]) this.state.tasks[id] = {};
      this.state.tasks[id].status = status === "late" ? "urgent" : status; // Simplification pour UI

      // Préparation pour le moteur de calcul de santé
      taskListForGameEngine.push({
        item: item,
        status: status,
      });
    });

    // Appel au moteur de gamification pour calculer le score (0-100)
    // Note: calculateHealthScore met à jour userStats.healthScore en interne
    Game.calculateHealthScore(taskListForGameEngine);
  }

  // --- VUE 3 : DASHBOARD ---
  renderDashboard() {
    const stats = Game.getStats();

    // 1. Rendu Jauge de Santé (Widget Central)
    this.renderHealthWidget(stats.healthScore);

    // 2. Rendu XP & Niveaux
    // On doit récupérer l'XP du prochain niveau via une méthode privée de Gamification normalement,
    // mais ici on va utiliser une approximation ou une méthode exposée si dispo.
    // Utilisation de getLevelConfig pour retrouver la config
    const config = Game.getLevelConfig();
    // Calcul manuel du cap du niveau actuel pour l'affichage (approximatif pour l'UI)
    const nextLevelXP = Math.floor(
      config.BASE_XP * Math.pow(stats.level, config.EXPONENT),
    );

    this.renderXPBar(stats.xp, nextLevelXP, stats.level);

    // 3. Rendu des Listes de Tâches
    this.renderTaskLists();

    // 4. Rendu des Badges
    this.renderBadgesList();
  }

  renderHealthWidget(score) {
    // Animation du texte
    animateValue(this.dom.dash.scoreDisplay, 0, score, 1500);

    // Calcul Offset SVG (Circonférence ~283)
    const circumference = 283;
    const offset = circumference - (score / 100) * circumference;
    this.dom.dash.ring.style.strokeDashoffset = offset;

    // Couleur & Texte Sémantique
    const label = this.dom.dash.statusText;
    if (score >= 85) {
      this.dom.dash.ring.style.stroke = "#10b981"; // Emerald
      label.innerText = "Habitat Sain 🌿";
      label.className = "text-xs text-emerald-600 font-bold fade-in";
    } else if (score >= 50) {
      this.dom.dash.ring.style.stroke = "#f59e0b"; // Amber
      label.innerText = "Maintenance Requise ⚠️";
      label.className = "text-xs text-amber-600 font-bold fade-in";
    } else {
      this.dom.dash.ring.style.stroke = "#ef4444"; // Red
      label.innerText = "État Critique 🚨";
      label.className = "text-xs text-red-600 font-bold fade-in";
    }
  }

  renderXPBar(current, max, level) {
    // Sécurité
    const safeMax = max || 100;
    const pct = Math.min(100, (current / safeMax) * 100);

    this.dom.dash.xpBar.style.width = `${pct}%`;
    this.dom.dash.xpText.innerText = `${current} / ${safeMax} XP`;
    this.dom.dash.level.innerText = `Niv. ${level}`;
  }

  renderTaskLists() {
    if (!this.dom.dash.urgent || !this.dom.dash.upcoming) return;

    this.dom.dash.urgent.innerHTML = "";
    this.dom.dash.upcoming.innerHTML = "";
    let urgentCount = 0;

    this.state.inventory.forEach((id) => {
      const item = INVENTORY.find((i) => i.id === id);
      const task = this.state.tasks[id];
      if (!item) return;

      const isUrgent = task.status === "urgent";

      const html = `
                <div class="bg-white p-4 rounded-2xl border ${isUrgent ? "border-red-100 shadow-sm shadow-red-100/50" : "border-slate-100"} flex items-center justify-between group transition-all hover:scale-[1.02]">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full ${isUrgent ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"} flex items-center justify-center text-lg">
                            <i class="fa-solid ${item.icon}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm">${item.name}</h4>
                            <span class="text-[10px] uppercase font-bold text-slate-400">Tous les ${item.frequency_months} mois</span>
                        </div>
                    </div>
                    ${
                      isUrgent
                        ? `<button onclick="app.quickFix('${item.id}')" class="text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow-md shadow-red-500/20 active:scale-95 transition-all">RÉGLER</button>`
                        : `<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"><i class="fa-solid fa-check mr-1"></i> OK</span>`
                    }
                </div>
            `;

      if (isUrgent) {
        this.dom.dash.urgent.innerHTML += html;
        urgentCount++;
      } else {
        this.dom.dash.upcoming.innerHTML += html;
      }
    });

    // Affichage conditionnel section urgente
    if (urgentCount > 0) {
      this.dom.dash.urgentSection.classList.remove("hidden");
    } else {
      this.dom.dash.urgentSection.classList.add("hidden");
    }
  }

  renderBadgesList() {
    if (!this.dom.dash.badgeContainer) return;

    const stats = Game.getStats();

    // Update compteur (ex: 2/5)
    if (this.dom.dash.badgeCount) {
      this.dom.dash.badgeCount.innerText = `${stats.unlockedBadges.length}/${Game.BADGES_DATA.length}`;
    }

    this.dom.dash.badgeContainer.innerHTML = Game.BADGES_DATA.map((badge) => {
      const isUnlocked = stats.unlockedBadges.includes(badge.id);

      // Classes dynamiques
      const cardClass = isUnlocked ? "unlocked badge-shine" : "locked";
      const iconClass = isUnlocked ? badge.color : "text-slate-300";
      const bgIconClass = isUnlocked ? "bg-slate-50" : "bg-slate-100";
      const textClass = isUnlocked ? "text-slate-800" : "text-slate-400";

      return `
                <div class="badge-card flex-none ${cardClass}">
                    <div class="w-10 h-10 rounded-full ${bgIconClass} flex items-center justify-center mb-2 text-xl shadow-sm transition-colors">
                        <i class="fa-solid ${badge.icon} ${iconClass}"></i>
                    </div>
                    <span class="font-bold ${textClass} text-[10px] text-center leading-tight mb-1 truncate w-full">${badge.name}</span>
                    <span class="text-[8px] text-slate-400 text-center leading-tight px-1 overflow-hidden h-6 flex items-center justify-center">
                        ${isUnlocked ? "Acquis!" : "???"}
                    </span>
                </div>
            `;
    }).join("");
  }

  // --- ACTION RAPIDE (DASHBOARD) ---
  quickFix(id) {
    const item = INVENTORY.find((i) => i.id === id);
    if (!item) return;

    // Optimistic Update
    this.state.tasks[id] = { lastDone: new Date().toISOString(), status: "ok" };

    // Calculs Gamification
    const taskXP = Game.calculateTaskXP(item);
    const xpResult = Game.addXP(taskXP);
    const newBadges = Game.checkBadges(item);

    // Feedback
    this.triggerConfetti("success");
    if (xpResult.leveledUp)
      setTimeout(() => alert(`Niveau Supérieur ! Niv ${xpResult.level}`), 500);
    if (newBadges.length > 0)
      setTimeout(
        () =>
          alert(`Nouveaux Badges: ${newBadges.map((b) => b.name).join(", ")}`),
        700,
      );

    // Save & Render
    this.recalcHealthStatus();
    this.saveState();
    this.renderDashboard();
  }

  triggerConfetti(type) {
    if (typeof confetti === "undefined") return;

    if (type === "levelup") {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#a855f7", "#fbbf24"],
      });
    } else if (type === "success") {
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 },
        colors: ["#10b981", "#34d399"], // Emerald
      });
    }
  }
}

// --- UTILITAIRES ---
function animateValue(obj, start, end, duration) {
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// Initialisation globale pour accès HTML (onclick)
window.app = new MaisonApp();
