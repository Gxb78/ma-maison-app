/**
 * MAISON VITAL DATABASE
 * * This file contains all static data for the application.
 * For a global launch, this structure is ready to be replaced
 * by a JSON fetch or an i18n (internationalization) system.
 */

export const INVENTORY_DATA = [
  {
    id: 1,
    name: "Pommeau Douche",
    icon: "fa-shower",
    freq: 3, // Frequency in months
    duration: 10, // Duration in minutes
    risk: "Légionelles & Perte débit",
    cost: 45,
    products: ["Vinaigre Blanc", "Sac Congélation"],
    steps: [
      "Verser vinaigre blanc dans un sac.",
      "Attacher le sac au pommeau avec un élastique.",
      "Laisser agir 2h minimum.",
      "Frotter les picots et rincer.",
    ],
  },
  {
    id: 2,
    name: "Lave-Linge",
    icon: "fa-soap",
    freq: 2,
    duration: 5,
    risk: "Panne Résistance",
    cost: 450,
    products: ["Vinaigre Blanc"],
    steps: [
      "Verser 1L de vinaigre dans le tambour.",
      "Lancer un cycle à vide à 90°C.",
      "Nettoyer le joint du hublot.",
      "Vidanger le filtre de pompe (trappe bas).",
    ],
  },
  {
    id: 3,
    name: "Filtre Hotte",
    icon: "fa-fire-burner",
    freq: 3,
    duration: 15,
    risk: "Incendie (Graisse)",
    cost: 200,
    products: ["Eau Bouillante", "Cristaux Soude"],
    steps: [
      "Démonter les grilles métalliques.",
      "Tremper dans l'évier avec eau bouillante + cristaux.",
      "Brosser et rincer.",
      "Bien sécher avant remontage.",
    ],
  },
  {
    id: 4,
    name: "Chauffe-Eau",
    icon: "fa-temperature-arrow-up",
    freq: 12,
    duration: 60,
    risk: "Surconsommation (+20%)",
    cost: 800,
    products: ["Pro Certifié"],
    steps: [
      "Actionner le groupe de sécurité (bouton rouge).",
      "Vérifier l'absence de fuite.",
      "Prendre RDV avec un professionnel pour l'entretien annuel.",
    ],
  },
  {
    id: 5,
    name: "VMC",
    icon: "fa-fan",
    freq: 6,
    duration: 20,
    risk: "Moisissures & Air Pollué",
    cost: 300,
    products: ["Chiffon Humide", "Escabeau"],
    steps: [
      "Démonter les bouches d'extraction.",
      "Laver à l'eau savonneuse.",
      "Dépoussiérer l'intérieur du conduit accessible.",
      "Remonter les bouches.",
    ],
  },
];
