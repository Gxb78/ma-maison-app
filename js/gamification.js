/**
 * MAISON VITAL - GAMIFICATION ENGINE
 * Gère la logique des courbes d'XP, le calcul du score de santé (entropie),
 * et le système de déblocage des badges (succès).
 */

// --- CONFIGURATION ---
const CONSTANTS = {
    BASE_XP: 100,      // XP requise pour le niveau 1 -> 2
    EXPONENT: 1.5,     // Facteur de courbure (Polynomiale Douce)
    BASE_TASK_XP: 50,  // XP forfaitaire par tâche
    TIME_BONUS: 2      // XP par minute de durée estimée
};

// --- BASE DE DONNÉES DES BADGES ---
// Structure extensible pour ajouter facilement de nouveaux succès
export const BADGES_DATA =;

// --- ÉTAT LOCAL (PERSISTANCE SIMULÉE) ---
// Dans une V2, cet objet serait hydraté depuis le localStorage ou une API.
let userStats = {
    xp: 0,
    level: 1,
    healthScore: 50,        // Démarre neutre
    unlockedBadges:,     // Liste des IDs débloqués
    totalTasksCompleted: 0,
    sessionTasks: 0,        // Compteur temporaire pour la session actuelle
    maxCostSaved: 0         // Pour le badge "Économe"
};

// --- MÉTHODES PUBLIQUES (API) ---

/**
 * Calcule l'XP nécessaire pour atteindre le niveau SUIVANT.
 * Modèle: Base * (Niveau ^ Exposant)
 */
function getXpForNextLevel(level) {
    return Math.floor(CONSTANTS.BASE_XP * Math.pow(level, CONSTANTS.EXPONENT));
}

/**
 * Ajoute de l'XP et gère la logique de montée de niveau.
 * Gère les montées de niveaux multiples (ex: gain massif d'XP).
 * @param {number} amount - Quantité d'XP à ajouter.
 * @returns {Object} Détails de l'événement (levelUp: boolean, etc.)
 */
export function addXP(amount) {
    userStats.xp += amount;
    
    let xpNeeded = getXpForNextLevel(userStats.level);
    let leveledUp = false;
    let levelsGained = 0;

    // Boucle tant que l'XP suffit pour passer au niveau suivant
    while (userStats.xp >= xpNeeded) {
        userStats.xp -= xpNeeded; // On garde le surplus (rollover)
        userStats.level++;
        levelsGained++;
        leveledUp = true;
        xpNeeded = getXpForNextLevel(userStats.level);
    }

    return {
        currentXP: userStats.xp,
        level: userStats.level,
        nextLevelXP: xpNeeded,
        leveledUp: leveledUp,
        levelsGained: levelsGained
    };
}

/**
 * Calcule le Score de Santé global basé sur l'entropie des tâches.
 * @param {Array} tasks - Liste des objets tâches avec status ('done', 'urgent', 'late').
 * @returns {number} Score de 0 à 100.
 */
export function calculateHealthScore(tasks) {
    if (!tasks |

| tasks.length === 0) return 100; // Pas de nouvelles, bonnes nouvelles

    let totalPenalty = 0;
    
    // Facteur d'amortissement : Plus il y a de tâches, moins une erreur individuelle coûte cher.
    // Cela évite de décourager les utilisateurs avec beaucoup d'équipements.
    const dampingFactor = Math.max(1, Math.log10(tasks.length) * 2);

    tasks.forEach(task => {
        // Mapping du Risque (Texte vers Valeur Numérique)
        let riskWeight = 1;
        const riskTxt = task.item.risk.toLowerCase();
        
        if (riskTxt.includes("incendie") |

| riskTxt.includes("légionelles") |
| riskTxt.includes("santé")) {
            riskWeight = 3; // Critique
        } else if (riskTxt.includes("panne") |

| riskTxt.includes("fuite")) {
            riskWeight = 2; // Moyen
        }

        // Calcul de la Pénalité
        if (task.status === "urgent") {
            // Tâche critique ignorée ou jamais faite
            totalPenalty += (25 * riskWeight) / dampingFactor;
        } else if (task.status === "late" |

| task.status === "old") {
            // Tâche en retard
            totalPenalty += (10 * riskWeight) / dampingFactor;
        }
        // 'done' et 'ok' n'ajoutent aucune pénalité (Entropie = 0)
    });

    // Inversion : Santé = 100 - Pénalités
    const rawScore = 100 - totalPenalty;
    
    // Bornage entre 0 et 100
    userStats.healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    
    return userStats.healthScore;
}

/**
 * Vérifie si des badges doivent être débloqués suite à une action.
 * @param {Object} lastTaskItem - L'objet équipement qui vient d'être traité (optionnel).
 * @returns {Array} Liste des nouveaux badges débloqués.
 */
export function checkBadges(lastTaskItem = null) {
    // Mise à jour des stats comportementales
    if (lastTaskItem) {
        userStats.totalTasksCompleted++;
        userStats.sessionTasks++;
        if (lastTaskItem.cost > userStats.maxCostSaved) {
            userStats.maxCostSaved = lastTaskItem.cost;
        }
    }

    const newUnlocks =;

    // Vérification de toutes les conditions
    BADGES_DATA.forEach(badge => {
        // On ne débloque pas un badge déjà acquis
        if (!userStats.unlockedBadges.includes(badge.id)) {
            if (badge.condition(userStats)) {
                userStats.unlockedBadges.push(badge.id);
                newUnlocks.push(badge);
            }
        }
    });

    return newUnlocks;
}

/**
 * Calcule l'XP à gagner pour une tâche spécifique.
 * Récompense la complexité (Durée) et l'importance (Fréquence).
 */
export function calculateTaskXP(item) {
    // Formule : Base + (Durée * 2) + Bonus pour les tâches rares (Fréquence > 6 mois)
    let xp = CONSTANTS.BASE_TASK_XP + (item.duration * CONSTANTS.TIME_BONUS);
    if (item.freq >= 6) xp += 50; // Bonus "Gros chantier"
    return Math.round(xp);
}

// Accesseurs
export const getStats = () => userStats;
export const getLevelConfig = () => CONSTANTS;