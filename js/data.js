/**
 * MAISON VITAL DATA STORE v2.0
 * Schéma préparé pour migration Supabase.
 * Les IDs sont des UUID simulés pour la cohérence future.
 */

export const INVENTORY =,
        risk_description: "Risque de légionelles & Perte de débit (-30%)",
        products:,
        steps:
    },
    {
        id: "asset_002",
        name: "Lave-Linge (Filtre)",
        icon: "fa-soap",
        category: "electromenager",
        frequency_months: 2,
        duration_minutes: 5,
        xp_reward: 30,
        difficulty: "easy",
        climate_tags: ["global"],
        risk_description: "Panne pompe de vidange & Mauvaises odeurs",
        products:,
        steps:
    },
    {
        id: "asset_003",
        name: "VMC / Aération",
        icon: "fa-fan",
        category: "air",
        frequency_months: 6,
        duration_minutes: 15,
        xp_reward: 80,
        difficulty: "medium",
        climate_tags: ["humid", "temperate"],
        risk_description: "Moisissures, Allergies & Surconsommation chauffage",
        products: ["Eau savonneuse", "Escabeau"],
        steps:
    },
    {
        id: "asset_004",
        name: "Détecteur Fumée",
        icon: "fa-bell",
        category: "securite",
        frequency_months: 12,
        duration_minutes: 2,
        xp_reward: 100,
        difficulty: "easy",
        climate_tags: ["global"],
        risk_description: "Défaillance en cas d'incendie (Sécurité Vitale)",
        products: ["Aspirateur", "Piles neuves (si besoin)"],
        steps:
    },
    {
        id: "asset_005",
        name: "Chauffe-Eau (GS)",
        icon: "fa-temperature-arrow-up",
        category: "hvac",
        frequency_months: 12,
        duration_minutes: 45,
        xp_reward: 200,
        difficulty: "hard",
        climate_tags: ["global"],
        risk_description: "Fuite, Corrosion & Surconsommation (+20%)",
        products:,
        steps:
    },
    {
        id: "asset_006",
        name: "Gouttières",
        icon: "fa-cloud-rain",
        category: "exterieur",
        frequency_months: 6,
        duration_minutes: 60,
        xp_reward: 150,
        difficulty: "hard",
        climate_tags: ["temperate", "rainy"],
        risk_description: "Infiltration d'eau en façade & Murs humides",
        products: ["Échelle", "Gants", "Jet d'eau"],
        steps:
    }
];