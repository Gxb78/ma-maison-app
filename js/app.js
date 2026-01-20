/**
 * MAISON VITAL LOGIC CORE v2.0
 * Architecture: State Store -> Optimistic UI -> Persistence
 */

import { INVENTORY } from './data.js';
import * as Game from "./gamification.js";


class MaisonApp {
    constructor() {
        // --- STATE INITIAL (Single Source of Truth) ---
        this.state = {
            inventory:, // Liste des IDs d'équipements sélectionnés
            tasks: {},     // Map: assetId -> { lastDone: ISOString, status: 'ok'|'urgent' }
            user: {
                xp: 0,
                health: 100, // 0-100
                level: "Novice"
            },
            // Runtime state (non-persisted)
            reviewQueue:,
            currentCardIdx: 0,
            isReviewing: false
        };

        // --- CACHE DOM ---
        this.dom = {
            setupGrid: document.getElementById('setup-grid'),
            views: {
                setup: document.getElementById('view-setup'),
                review: document.getElementById('view-review'),
                dashboard: document.getElementById('view-dashboard')
            },
            card: {
                container: document.getElementById('active-card'),
                title: document.getElementById('card-title'),
                icon: document.getElementById('card-icon'),
                tutorial: document.getElementById('card-tutorial'),
                products: document.getElementById('card-products'),
                duration: document.getElementById('card-duration')
            },
            dash: {
                urgent: document.getElementById('list-urgent'),
                upcoming: document.getElementById('list-upcoming'),
                score: document.getElementById('health-score'),
                circle: document.getElementById('health-circle'),
                xp: document.getElementById('xp-score'),
                level: document.getElementById('user-level'),
                nextXp: document.getElementById('next-level-xp'),
                xpProgress: document.getElementById('xp-progress'),
                urgentSection: document.getElementById('section-urgent'),
                date: document.getElementById('dashboard-date')
            },
            progress: {
                bar: document.getElementById('review-progress-bar'),
                text: document.getElementById('progress-text')
            }
        };

        this.init();
    }

    init() {
        this.loadState();
        this.renderInventory();
        
        // Si l'utilisateur a déjà un inventaire, on va direct au dashboard
        // sauf s'il n'a jamais fini l'onboarding
        if (this.state.inventory.length > 0 && Object.keys(this.state.tasks).length > 0) {
            this.recalcHealthStatus(); // Vérifier si le temps a passé
            this.switchView('dashboard');
            this.renderDashboard();
        } else {
            // Premier lancement ou reset
            this.switchView('setup');
        }

        // Setup Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.dom.dash.date.innerText = new Date().toLocaleDateString('fr-FR', options);
    }

    // --- PERSISTENCE LAYER ---
    saveState() {
        // On ne sauvegarde que les données persistantes, pas l'état runtime
        const persist = {
            inventory: this.state.inventory,
            tasks: this.state.tasks,
            user: this.state.user
        };
        localStorage.setItem('maison_state', JSON.stringify(persist));
    }

    loadState() {
        const stored = localStorage.getItem('maison_state');
        if (stored) {
            const parsed = JSON.parse(stored);
            this.state = {...this.state,...parsed };
        }
    }

    resetData() {
        if(confirm("Attention : Voulez-vous réinitialiser toutes les données et recommencer?")) {
            localStorage.clear();
            location.reload();
        }
    }

    // --- ROUTER / NAVIGATION ---
    switchView(viewName) {
        // Masquer toutes les vues
        Object.values(this.dom.views).forEach(el => {
            el.classList.add('hidden');
            // Reset transforms for cleanliness
            if(viewName!== 'review') el.classList.remove('translate-x-0', 'translate-x-full');
        });

        const target = this.dom.views[viewName];
        target.classList.remove('hidden');
        
        // Animation simple
        if (viewName === 'review') {
            target.classList.remove('translate-x-full');
            target.classList.add('translate-x-0');
        } else {
            target.classList.add('translate-x-0');
        }
    }

    // --- VUE 1 : INVENTAIRE ---
    renderInventory() {
        this.dom.setupGrid.innerHTML = INVENTORY.map(item => {
            const isSelected = this.state.inventory.includes(item.id);
            return `
                <div onclick="app.toggleAsset('${item.id}')" 
                     class="inventory-card p-4 rounded-2xl bg-white border-2 ${isSelected? 'border-emerald-500 bg-emerald-50' : 'border-transparent'} shadow-sm cursor-pointer flex flex-col items-center gap-3 relative h-32 justify-center">
                    <div class="w-10 h-10 rounded-full ${isSelected? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center text-lg transition-colors">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <span class="font-bold text-slate-700 text-xs text-center leading-tight">${item.name}</span>
                    ${isSelected? '<div class="absolute top-2 right-2 text-emerald-500 fade-in"><i class="fa-solid fa-circle-check"></i></div>' : ''}
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
        // Logique : Tout ce qui est dans l'inventaire.
        this.state.reviewQueue = INVENTORY.filter(i => this.state.inventory.includes(i.id));
        this.state.currentCardIdx = 0;
        this.state.isReviewing = true;
        
        this.switchView('review');
        this.loadCard();
    }

    loadCard() {
        const item = this.state.reviewQueue[this.state.currentCardIdx];
        
        // Fin de la queue?
        if (!item) {
            this.finishReview();
            return;
        }

        // Reset UI Carte
        this.dom.card.container.classList.remove('rotate-y-180');
        
        // Injection Contenu
        this.dom.card.title.innerText = item.name;
        this.dom.card.duration.innerText = `${item.duration_minutes} min`;
        this.dom.card.icon.innerHTML = `<i class="fa-solid ${item.icon}"></i>`;
        
        // Ingrédients
        this.dom.card.products.innerHTML = item.products.map(p => 
            `<span class="bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs border border-slate-600">${p}</span>`
        ).join("");

        // Tutoriel
        this.dom.card.tutorial.innerHTML = item.steps.map((step, i) => `
            <div class="flex gap-4">
                <div class="w-6 h-6 rounded-full bg-emerald-500 text-slate-900 font-bold text-xs flex items-center justify-center flex-none shadow-lg shadow-emerald-500/30">${i+1}</div>
                <p class="pt-0.5 leading-snug">${step}</p>
            </div>
        `).join("");

        // Barre de Progression
        const progress = ((this.state.currentCardIdx) / this.state.reviewQueue.length) * 100;
        this.dom.progress.bar.style.width = `${progress}%`;
        this.dom.progress.text.innerText = `Équipement ${this.state.currentCardIdx + 1} / ${this.state.reviewQueue.length}`;
    }

    flipCard() {
        this.dom.card.container.classList.toggle('rotate-y-180');
    }

    handleInput(action) {
        const item = this.state.reviewQueue[this.state.currentCardIdx];
        const now = new Date().toISOString();

        if (action === 'good') {
            // Déclaré comme fait récemment -> On set la date à aujourd'hui pour simplifier le MVP
            // Ou on pourrait demander "quand?", mais restons "Fast"
            this.state.tasks[item.id] = { lastDone: now, status: 'ok' };
            this.addXP(20); // Petite récompense
        } 
        else if (action === 'now') {
            // Fait MAINTENANT via le tuto
            this.state.tasks[item.id] = { lastDone: now, status: 'ok' };
            this.addXP(item.xp_reward); // Grosse récompense
            this.triggerConfetti();
        }
        else {
            // Pas fait / Mauvais état
            // On met lastDone à null ou très vieux pour forcer l'urgence
            this.state.tasks[item.id] = { lastDone: null, status: 'urgent' };
        }

        // Carte suivante avec délai pour l'animation
        this.state.currentCardIdx++;
        setTimeout(() => this.loadCard(), 250); 
    }

    abortReview() {
        this.state.isReviewing = false;
        this.switchView('setup');
    }

    finishReview() {
        this.state.isReviewing = false;
        this.recalcHealthStatus();
        this.saveState();
        this.switchView('dashboard');
        this.renderDashboard();
    }

    // --- LOGIQUE MÉTIER & CALCULS ---
    
    // Vérifie si les tâches sont périmées en fonction de la fréquence
    recalcHealthStatus() {
        const now = new Date();
        let totalItems = this.state.inventory.length;
        let healthyItems = 0;

        this.state.inventory.forEach(id => {
            const task = this.state.tasks[id];
            const item = INVENTORY.find(i => i.id === id);
            
            if (!task ||!task.lastDone) {
                // Jamais fait
                if(this.state.tasks[id]) this.state.tasks[id].status = 'urgent';
                return;
            }

            // Calcul date d'expiration
            const lastDate = new Date(task.lastDone);
            // Ajoute X mois
            const dueDate = new Date(lastDate.setMonth(lastDate.getMonth() + item.frequency_months));

            if (now > dueDate) {
                this.state.tasks[id].status = 'urgent';
            } else {
                this.state.tasks[id].status = 'ok';
                healthyItems++;
            }
        });

        // Calcul du Score de Santé (0-100)
        // Algo simple : Ratio d'équipements OK
        if (totalItems > 0) {
            this.state.user.health = Math.round((healthyItems / totalItems) * 100);
        } else {
            this.state.user.health = 100; // Par défaut
        }
    }

    // --- VUE 3 : DASHBOARD ---
    renderDashboard() {
        // 1. Cercle de Santé
        const circumference = 48 * 2 * Math.PI; // r=48
        const offset = circumference - (this.state.user.health / 100) * circumference;
        
        this.dom.dash.circle.style.strokeDashoffset = offset;
        // Couleur dynamique : Rouge si < 50, Orange < 80, Vert > 80
        let color = '#ef4444'; // Red
        if (this.state.user.health >= 80) color = '#10b981'; // Emerald
        else if (this.state.user.health >= 50) color = '#f59e0b'; // Amber
        
        this.dom.dash.circle.style.color = color;
        this.dom.dash.score.innerText = this.state.user.health;

        // 2. XP & Niveaux
        this.dom.dash.xp.innerText = `${this.state.user.xp} XP`;
        
        // Logique de niveau très basique
        let levelName = "Novice";
        let nextLevel = 500;
        if (this.state.user.xp >= 500) { levelName = "Bricoleur"; nextLevel = 1000; }
        if (this.state.user.xp >= 1000) { levelName = "Expert"; nextLevel = 2500; }
        if (this.state.user.xp >= 2500) { levelName = "Maître"; nextLevel = 5000; }
        
        this.dom.dash.level.innerHTML = `<i class="fa-solid fa-medal mr-1 text-emerald-400"></i> ${levelName}`;
        this.dom.dash.nextXp.innerText = nextLevel;
        
        // Barre de progression XP (relative au niveau courant pour simplifier l'affichage)
        // Pour faire simple : % du total vers le nextLevel
        let xpPercent = Math.min(100, (this.state.user.xp / nextLevel) * 100);
        this.dom.dash.xpProgress.style.width = `${xpPercent}%`;

        // 3. Rendu des Listes
        this.dom.dash.urgent.innerHTML = "";
        this.dom.dash.upcoming.innerHTML = "";
        let urgentCount = 0;

        this.state.inventory.forEach(id => {
            const item = INVENTORY.find(i => i.id === id);
            const task = this.state.tasks[id];
            
            // Sécurité si l'item a été supprimé du data.js mais reste dans le state
            if (!item) return;

            const isUrgent = task.status === 'urgent';

            const html = `
                <div class="bg-white p-4 rounded-2xl border ${isUrgent? 'border-red-100 shadow-sm shadow-red-100/50' : 'border-slate-100'} flex items-center justify-between group transition-all hover:scale-[1.02]">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full ${isUrgent? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'} flex items-center justify-center text-lg">
                            <i class="fa-solid ${item.icon}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm">${item.name}</h4>
                            <span class="text-[10px] uppercase font-bold text-slate-400">Tous les ${item.frequency_months} mois</span>
                        </div>
                    </div>
                    ${isUrgent 
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

        // Affichage conditionnel des sections
        if (urgentCount > 0) {
            this.dom.dash.urgentSection.classList.remove('hidden');
        } else {
            this.dom.dash.urgentSection.classList.add('hidden');
        }
    }

    // --- ACTION RAPIDE (DASHBOARD) ---
    quickFix(id) {
        const item = INVENTORY.find(i => i.id === id);
        
        // Optimistic Update : On considère que c'est fait
        this.state.tasks[id] = { lastDone: new Date().toISOString(), status: 'ok' };
        
        // Récompense
        this.addXP(item.xp_reward);
        this.triggerConfetti();
        
        // Recalcul & Save
        this.recalcHealthStatus();
        this.saveState();
        this.renderDashboard();
    }

    // --- GAMIFICATION ENGINE ---
    addXP(amount) {
        this.state.user.xp += amount;
    }

    triggerConfetti() {
        // Confetti "Canon" effect
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#059669', '#fbbf24'], // Emerald + Gold
            disableForReducedMotion: true
        });
    }
}

// Initialisation globale
window.app = new MaisonApp();


// --- MODIFICATION : REVIEW (CHRONO) ---

window.confirmTask = (action) => {
    const item = state.queue[state.currentIdx];

    if (action === "now") {
        // Tâche accomplie : Gain d'XP!
        state.tasks.push({ item: item, status: "done", timeDebt: 0 });
        
        // 1. Calcul de l'XP spécifique à cette tâche
        const xpEarned = Game.calculateTaskXP(item);
        
        // 2. Ajout de l'XP au moteur
        const progress = Game.addXP(xpEarned);
        
        // 3. Vérification des Badges
        const newBadges = Game.checkBadges(item);

        // 4. Feedback Immédiat (Console pour debug, visuel géré au dashboard)
        console.log(`XP Gagnée: ${xpEarned}. Niveau actuel: ${progress.level}`);
        
        // Stockage temporaire des événements pour les afficher au dashboard
        if (!state.events) state.events =;
        if (progress.leveledUp) state.events.push({ type: 'levelup', level: progress.level });
        if (newBadges.length > 0) state.events.push({ type: 'badge', badges: newBadges });

    } else {
        // Tâche reportée ou urgente : Pas d'XP, impactera le score de santé
        const status = action === "later"? "late" : "urgent";
        state.tasks.push({ item: item, status: status, timeDebt: item.duration });
    }
    nextCard();
};

// --- MODIFICATION : DASHBOARD ---

function showDashboard() {
    views.review.classList.add("hidden");
    views.dashboard.classList.remove("hidden");

    //... (Code existant pour le temps total)...

    // === INTÉGRATION GAMIFICATION ===
    
    // 1. Mise à jour du Score de Santé (Entropie)
    const healthScore = Game.calculateHealthScore(state.tasks);
    renderHealthWidget(healthScore);

    // 2. Mise à jour de la barre d'XP
    const stats = Game.getStats();
    // On recalcule le max XP du niveau courant pour la barre de progression
    const nextLevelTotalXP = Game.getXpForNextLevel? Game.getXpForNextLevel(stats.level) : 100; // Fallback
    renderXPBar(stats.xp, nextLevelTotalXP, stats.level);

    // 3. Rendu des Badges
    renderBadgesList();

    // 4. Gestion des Célébrations (Effets "Juicy")
    handleCelebrations();
}

// === NOUVELLES FONCTIONS D'INTERFACE (UI HELPERS) ===

/**
 * Affiche le widget de santé avec animation du SVG et changement de couleur dynamique.
 */
function renderHealthWidget(score) {
    const ring = document.getElementById("health-ring");
    const text = document.getElementById("health-score-display");
    const label = document.getElementById("health-status-text");
    
    // Animation du nombre (compteur)
    animateValue(text, parseInt(text.innerText) |

| 0, score, 1500);

    // Calcul de l'offset SVG pour le cercle
    // La circonférence est ~283 (2 * PI * 45)
    // Offset = Circonférence - (Pourcentage * Circonférence)
    const circumference = 283;
    const offset = circumference - ((score / 100) * circumference);
    ring.style.strokeDashoffset = offset;

    // Logique de Couleur Sémantique (Rouge -> Ambre -> Émeraude)
    if (score >= 85) {
        ring.style.stroke = "#10b981"; // Emerald-500
        label.innerText = "Habitat Sain 🌿";
        label.className = "text-xs text-emerald-600 font-bold fade-in";
    } else if (score >= 50) {
        ring.style.stroke = "#f59e0b"; // Amber-500
        label.innerText = "Maintenance Requise ⚠️";
        label.className = "text-xs text-amber-600 font-bold fade-in";
    } else {
        ring.style.stroke = "#ef4444"; // Red-500
        label.innerText = "État Critique 🚨";
        label.className = "text-xs text-red-600 font-bold fade-in";
        // Ajout d'une pulsation pour l'urgence
        ring.classList.add("animate-pulse");
    }
}

/**
 * Met à jour la barre d'expérience.
 */
function renderXPBar(current, max, level) {
    const bar = document.getElementById("xp-bar");
    const text = document.getElementById("xp-text");
    const lvlDisplay = document.getElementById("level-display");

    // Calcul du pourcentage de remplissage
    // Sécurité : éviter division par zéro
    const safeMax = max |

| 100;
    const pct = Math.min(100, (current / safeMax) * 100);
    
    bar.style.width = `${pct}%`;
    text.innerText = `${current} / ${safeMax} XP`;
    lvlDisplay.innerText = `Niv. ${level}`;
}

/**
 * Génère le HTML pour la liste des badges.
 */
function renderBadgesList() {
    const container = document.getElementById("badge-container");
    const countDisplay = document.getElementById("badge-count");
    const stats = Game.getStats();
    
    // Mise à jour du compteur (ex: 2/5)
    countDisplay.innerText = `${stats.unlockedBadges.length}/${Game.BADGES_DATA.length}`;

    container.innerHTML = Game.BADGES_DATA.map(badge => {
        const isUnlocked = stats.unlockedBadges.includes(badge.id);
        
        // Classes dynamiques selon l'état
        const cardClass = isUnlocked? "unlocked badge-shine" : "locked";
        const iconClass = isUnlocked? badge.color : "text-slate-300";
        const bgIconClass = isUnlocked? "bg-slate-50" : "bg-slate-100";
        const textClass = isUnlocked? "text-slate-800" : "text-slate-400";

        return `
            <div class="badge-card flex-none ${cardClass}">
                <div class="w-10 h-10 rounded-full ${bgIconClass} flex items-center justify-center mb-2 text-xl shadow-sm transition-colors">
                    <i class="fa-solid ${badge.icon} ${iconClass}"></i>
                </div>
                <span class="font-bold ${textClass} text-[10px] text-center leading-tight mb-1 truncate w-full">${badge.name}</span>
                <span class="text-[8px] text-slate-400 text-center leading-tight px-1 overflow-hidden h-6 flex items-center justify-center">
                    ${isUnlocked? 'Acquis!' : '???'}
                </span>
            </div>
        `;
    }).join("");
}

/**
 * Gère les effets visuels de célébration (Confetti).
 */
function handleCelebrations() {
    if (!state.events |

| state.events.length === 0) return;

    state.events.forEach(event => {
        if (event.type === 'levelup') {
            // Explosion de confettis centrale
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#fbbf24'] // Indigo, Violet, Or
            });
            setTimeout(() => alert(`Niveau Supérieur! Bienvenue au niveau ${event.level}!`), 500);
        } else if (event.type === 'badge') {
            // Petits confettis dorés
            confetti({
                particleCount: 60,
                spread: 50,
                origin: { y: 0.8 },
                colors: // Or
            });
            const names = event.badges.map(b => b.name).join(", ");
            setTimeout(() => alert(`Succès Débloqué : ${names}!`), 500);
        }
    });

    // Nettoyage des événements
    state.events =;
}

/**
 * Utilitaire pour animer les nombres (0 -> 85) progressivement.
 */
function animateValue(obj, start, end, duration) {
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