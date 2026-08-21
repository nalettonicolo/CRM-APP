/**
 * Catalogo Ajax Systems — prezzi consigliati IT (IVA esclusa) da ajax.systems/it.
 * Usato come listino base antifurti nel CRM Impianti Elettrici.
 * I prezzi listino ufficiali distributore possono differire: aggiornabili in UI.
 */
export type AjaxSeedItem = {
  sku: string;
  name: string;
  listPrice: number;
  productLine: string;
  unit?: string;
};

export const AJAX_CATALOG_META = {
  supplierName: "Ajax Systems",
  title: "Catalogo Ajax — listino consigliato IT",
  category: "SECURITY" as const,
  description:
    "Listino antifurti Ajax (prezzi consigliati al pubblico, IVA esclusa). Aggiorna prezzi e sconto fornitore in base al tuo distributore.",
};

/** SKU interni stabili (slug) — il codice ufficiale Ajax varia per colore/regione. */
export const AJAX_SEED_ITEMS: AjaxSeedItem[] = [
  // Kit
  { sku: "AJ-STARTERKIT", name: "StarterKit (Hub + MotionProtect + DoorProtect + SpaceControl)", listPrice: 435, productLine: "Kit" },
  { sku: "AJ-STARTERKIT-4G", name: "StarterKit (4G) (Hub 2 4G + MotionProtect + DoorProtect + SpaceControl)", listPrice: 645, productLine: "Kit" },
  { sku: "AJ-STARTERKIT-CAM", name: "StarterKit Cam (Hub 2 + MotionCam + DoorProtect + SpaceControl)", listPrice: 655, productLine: "Kit" },
  { sku: "AJ-STARTERKIT-CAM-PLUS", name: "StarterKit Cam Plus HDR (Hub 2 Plus + MotionCam + DoorProtect + SpaceControl)", listPrice: 467.23, productLine: "Kit" },

  // Hub
  { sku: "AJ-HUB-2G", name: "Hub (2G) Jeweller", listPrice: 267, productLine: "Hub" },
  { sku: "AJ-HUB2-2G", name: "Hub 2 (2G) Jeweller", listPrice: 372, productLine: "Hub" },
  { sku: "AJ-HUB2-4G", name: "Hub 2 (4G) Jeweller", listPrice: 512, productLine: "Hub" },
  { sku: "AJ-HUB2-PLUS", name: "Hub 2 Plus Jeweller", listPrice: 636, productLine: "Hub" },
  { sku: "AJ-HUB-BP", name: "Hub BP Jeweller (a batteria)", listPrice: 471, productLine: "Hub" },
  { sku: "AJ-HUB-HYBRID-4G", name: "Superior Hub Hybrid (4G)", listPrice: 0, productLine: "Hub" },
  { sku: "AJ-HUB-G3", name: "Superior Hub G3 Jeweller", listPrice: 0, productLine: "Hub" },

  // Ripetitori
  { sku: "AJ-REX", name: "ReX Jeweller", listPrice: 199, productLine: "Ripetitori" },
  { sku: "AJ-REX2", name: "ReX 2 Jeweller", listPrice: 259, productLine: "Ripetitori" },
  { sku: "AJ-REX-G3", name: "Superior ReX G3 Jeweller", listPrice: 0, productLine: "Ripetitori" },

  // Apertura
  { sku: "AJ-DOORPROTECT", name: "DoorProtect Jeweller", listPrice: 60, productLine: "Apertura" },
  { sku: "AJ-DOORPROTECT-PLUS", name: "DoorProtect Plus Jeweller", listPrice: 89, productLine: "Apertura" },
  { sku: "AJ-DOORPROTECT-S", name: "DoorProtect S Jeweller", listPrice: 0, productLine: "Apertura" },
  { sku: "AJ-DOORPROTECT-G3", name: "Superior DoorProtect G3 Jeweller", listPrice: 0, productLine: "Apertura" },
  { sku: "AJ-DOORPROTECT-FIBRA", name: "Superior DoorProtect Fibra", listPrice: 0, productLine: "Apertura" },
  { sku: "AJ-DOORPROTECT-PLUS-FIBRA", name: "Superior DoorProtect Plus Fibra", listPrice: 0, productLine: "Apertura" },

  // Movimento
  { sku: "AJ-MOTIONPROTECT", name: "MotionProtect Jeweller", listPrice: 49.89, productLine: "Movimento" },
  { sku: "AJ-MOTIONPROTECT-PLUS", name: "MotionProtect Plus Jeweller", listPrice: 109, productLine: "Movimento" },
  { sku: "AJ-MOTIONPROTECT-CURTAIN", name: "MotionProtect Curtain Jeweller", listPrice: 60.81, productLine: "Movimento" },
  { sku: "AJ-MOTIONCAM", name: "MotionCam Jeweller", listPrice: 179, productLine: "Movimento" },
  { sku: "AJ-MOTIONCAM-PHOD", name: "MotionCam (PhOD) Jeweller", listPrice: 199, productLine: "Movimento" },
  { sku: "AJ-MOTIONCAM-OUTDOOR", name: "MotionCam Outdoor Jeweller", listPrice: 329, productLine: "Movimento" },
  { sku: "AJ-MOTIONCAM-OUTDOOR-PHOD", name: "MotionCam Outdoor (PhOD) Jeweller", listPrice: 369, productLine: "Movimento" },
  { sku: "AJ-DUALCURTAIN-OUTDOOR", name: "DualCurtain Outdoor Jeweller", listPrice: 159.95, productLine: "Movimento" },
  { sku: "AJ-MOTIONPROTECT-OUTDOOR", name: "MotionProtect Outdoor Jeweller", listPrice: 249, productLine: "Movimento" },
  { sku: "AJ-MOTIONCAM-S", name: "MotionCam S Jeweller", listPrice: 0, productLine: "Movimento" },
  { sku: "AJ-MOTIONCAM-HD", name: "MotionCam HD Jeweller", listPrice: 0, productLine: "Movimento" },

  // Vetro / allagamento
  { sku: "AJ-GLASSPROTECT", name: "GlassProtect Jeweller", listPrice: 79, productLine: "Vetro" },
  { sku: "AJ-LEAKSPROTECT", name: "LeaksProtect Jeweller", listPrice: 69, productLine: "Allagamento" },
  { sku: "AJ-WATERSTOP", name: "WaterStop Jeweller", listPrice: 189, productLine: "Allagamento" },

  // Tastiere
  { sku: "AJ-KEYPAD", name: "KeyPad Jeweller", listPrice: 129, productLine: "Tastiere" },
  { sku: "AJ-KEYPAD-PLUS", name: "KeyPad Plus Jeweller", listPrice: 169, productLine: "Tastiere" },
  { sku: "AJ-KEYPAD-COMFORT", name: "KeyPad Comfort Jeweller", listPrice: 0, productLine: "Tastiere" },
  { sku: "AJ-KEYPAD-TOUCHSCREEN", name: "KeyPad Touchscreen Jeweller", listPrice: 349, productLine: "Tastiere" },
  { sku: "AJ-KEYPAD-OUTDOOR", name: "KeyPad Outdoor Jeweller", listPrice: 0, productLine: "Tastiere" },

  // Sirene
  { sku: "AJ-HOMESIREN", name: "HomeSiren Jeweller", listPrice: 89, productLine: "Sirene" },
  { sku: "AJ-STREETSIREN", name: "StreetSiren Jeweller", listPrice: 94.59, productLine: "Sirene" },
  { sku: "AJ-STREETSIREN-DOUBLEDECK", name: "StreetSiren DoubleDeck Jeweller", listPrice: 179, productLine: "Sirene" },
  { sku: "AJ-STREETSIREN-FIBRA", name: "Superior StreetSiren Fibra", listPrice: 0, productLine: "Sirene" },
  { sku: "AJ-HOMESIREN-FIBRA", name: "Superior HomeSiren Fibra", listPrice: 0, productLine: "Sirene" },

  // Comandi
  { sku: "AJ-SPACECONTROL", name: "SpaceControl Jeweller", listPrice: 25.47, productLine: "Comandi" },
  { sku: "AJ-BUTTON", name: "Button Jeweller", listPrice: 49, productLine: "Comandi" },
  { sku: "AJ-DOUBLEBUTTON", name: "DoubleButton Jeweller", listPrice: 49, productLine: "Comandi" },
  { sku: "AJ-TAG", name: "Tag (conf. 3 / 10 pz — prezzo unitario)", listPrice: 8, productLine: "Comandi" },
  { sku: "AJ-PASS", name: "Pass (conf. — prezzo unitario)", listPrice: 8, productLine: "Comandi" },

  // Automazione / relè
  { sku: "AJ-RELAY", name: "Relay Jeweller", listPrice: 59, productLine: "Automazione" },
  { sku: "AJ-WALLSWITCH", name: "WallSwitch Jeweller", listPrice: 69, productLine: "Automazione" },
  { sku: "AJ-SOCKET", name: "Socket Jeweller", listPrice: 99, productLine: "Automazione" },
  { sku: "AJ-SOCKET-TYPE-F", name: "Socket (Type F) Jeweller", listPrice: 99, productLine: "Automazione" },
  { sku: "AJ-LIGHTSWITCH-1GANG", name: "LightSwitch 1-gang Jeweller", listPrice: 0, productLine: "Automazione" },
  { sku: "AJ-LIGHTSWITCH-2GANG", name: "LightSwitch 2-gang Jeweller", listPrice: 0, productLine: "Automazione" },

  // Integrazione
  { sku: "AJ-MULTITRANSMITTER", name: "MultiTransmitter Jeweller", listPrice: 199, productLine: "Integrazione" },
  { sku: "AJ-TRANSMITTER", name: "Transmitter Jeweller", listPrice: 69, productLine: "Integrazione" },
  { sku: "AJ-TRANSMITTER-FIBRA", name: "Transmitter Fibra", listPrice: 0, productLine: "Integrazione" },
  { sku: "AJ-MULTITRANSMITTER-FIBRA", name: "MultiTransmitter Fibra", listPrice: 0, productLine: "Integrazione" },

  // Video
  { sku: "AJ-TURRETCAM", name: "TurretCam", listPrice: 0, productLine: "Video" },
  { sku: "AJ-DOMECAM-MINI", name: "DomeCam Mini", listPrice: 0, productLine: "Video" },
  { sku: "AJ-BULLETCAM", name: "BulletCam", listPrice: 0, productLine: "Video" },
  { sku: "AJ-DOORBELL", name: "DoorBell", listPrice: 0, productLine: "Video" },
  { sku: "AJ-NVR", name: "NVR", listPrice: 0, productLine: "Video" },

  // Qualità aria / comfort
  { sku: "AJ-LIFEQUALITY", name: "LifeQuality Jeweller", listPrice: 189, productLine: "Comfort" },
  { sku: "AJ-FIREPROTECT", name: "FireProtect Jeweller", listPrice: 99, productLine: "Antincendio" },
  { sku: "AJ-FIREPROTECT-PLUS", name: "FireProtect Plus Jeweller", listPrice: 129, productLine: "Antincendio" },
  { sku: "AJ-FIREPROTECT-2", name: "FireProtect 2 Jeweller", listPrice: 0, productLine: "Antincendio" },

  // Accessori
  { sku: "AJ-CASE-A", name: "Case A (custodia)", listPrice: 0, productLine: "Accessori" },
  { sku: "AJ-CASE-B", name: "Case B (custodia)", listPrice: 0, productLine: "Accessori" },
  { sku: "AJ-CASE-D", name: "Case D (custodia)", listPrice: 0, productLine: "Accessori" },
  { sku: "AJ-HOLDER", name: "Holder / Bracket", listPrice: 15, productLine: "Accessori" },
  { sku: "AJ-STREETSIREN-BRACKET", name: "StreetSiren Bracket", listPrice: 25, productLine: "Accessori" },
];
