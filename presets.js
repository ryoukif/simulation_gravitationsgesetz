function makeBody({
  name,
  mass,
  physicalRadius,
  drawRadius,
  renderMode = "symbolic",
  fixed = false,
  color,
  position,
  velocity,
}) {
  return {
    name,
    mass,
    physicalRadius,
    drawRadius,
    renderMode,
    fixed,
    color,
    position,
    velocity,
  };
}

const PRESETS = [
  {
    id: "earth-satellite",
    name: "Erde – künstlicher Satellit",
    description:
      "Eine erdnahe Umlaufbahn mit realistischen Größenordnungen. Über die Startgeschwindigkeit lassen sich Kreisbahn, Absturz und Flucht sichtbar machen.",
    didactics:
      "Eine Umlaufbahn ist ein ständiges Fallen um die Erde. Die Geschwindigkeit zeigt tangential, die Gravitationskraft radial nach innen.",
    editablePair: { anchorIndex: 0, bodyIndex: 1 },
    collisionMode: "freeze-secondary",
    view: { mode: "body", bodyIndex: 0, scaleMetersPerPixel: 25000 },
    recommended: {
      dt: 5,
      speedFactor: 840,
      zoom: 1.1,
      trailLength: 10000,
      arrowScale: 1.0,
    },
    bodies: [
      makeBody({
        name: "Erde",
        mass: 5.972e24,
        physicalRadius: 6.371e6,
        drawRadius: 22,
        renderMode: "physical",
        color: "#4f8fdb",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      }),
      makeBody({
        name: "Satellit",
        mass: 1200,
        physicalRadius: 1.5e3,
        drawRadius: 6,
        color: "#f7d774",
        position: { x: 6.921e6, y: 0 },
        velocity: { x: 0, y: 7580 },
      }),
    ],
    presetFacts: [
      "Zentralkörper: Erde, m = 5,972 · 10^24 kg",
      "Satellit in etwa 550 km Höhe",
      "Typische Kreisbahngeschwindigkeit: etwa 7,58 km/s",
      "Geeignet für den Vergleich: zu langsam, Kreisbahn, Flucht",
    ],
  },
  {
    id: "earth-moon-class9",
    name: "Erde – Mond (vereinfacht)",
    description:
      "Vereinfachte Erde-Mond-Darstellung für den Einstieg. Die Erde bleibt bewusst fest, damit die Mondbahn leicht als Umlaufbahn um die Erde gelesen werden kann.",
    didactics:
      "Für Klasse 9 ist die feste Erde oft anschaulicher: Der Mond bewegt sich sichtbar auf einer Bahn um die Erde, während Kraft und Geschwindigkeit ihre Rollen klar zeigen.",
    referenceFrame: "fixed-anchor",
    editablePair: { anchorIndex: 0, bodyIndex: 1 },
    collisionMode: "stop-all",
    view: { mode: "body", bodyIndex: 0, scaleMetersPerPixel: 1.2e6 },
    recommended: {
      dt: 1800,
      speedFactor: 172800,
      zoom: 1.0,
      trailLength: 10000,
      arrowScale: 0.7,
    },
    bodies: [
      makeBody({
        name: "Erde",
        mass: 5.972e24,
        physicalRadius: 6.371e6,
        drawRadius: 18,
        renderMode: "physical",
        fixed: true,
        color: "#4f8fdb",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      }),
      makeBody({
        name: "Mond",
        mass: 7.342e22,
        physicalRadius: 1.737e6,
        drawRadius: 8,
        renderMode: "physical",
        color: "#d8dde8",
        position: { x: 3.844e8, y: 0 },
        velocity: { x: 0, y: 1022 },
      }),
    ],
    presetFacts: [
      "Mittlerer Abstand Erde–Mond: 384 400 km",
      "Typische Bahngeschwindigkeit des Mondes: etwa 1,02 km/s",
      "Die Erde ist hier didaktisch festgehalten und driftet deshalb nicht",
    ],
  },
  {
    id: "earth-moon-barycenter",
    name: "Erde – Mond (Schwerpunktsystem)",
    description:
      "Erde und Mond bewegen sich beide um ihren gemeinsamen Schwerpunkt. Diese Version ist für die Oberstufe physikalisch sauberer als die vereinfachte Mittelstufenansicht.",
    didactics:
      "Im Schwerpunktsystem ruht der Schwerpunkt des Zweikörpersystems. So sieht man, dass auch die Erde eine kleine Gegenbewegung ausführt.",
    referenceFrame: "barycenter",
    editablePair: { anchorIndex: 0, bodyIndex: 1 },
    collisionMode: "stop-all",
    view: { mode: "barycenter", bodyIndex: 0, scaleMetersPerPixel: 1.2e6 },
    recommended: {
      dt: 1800,
      speedFactor: 172800,
      zoom: 1.0,
      trailLength: 10000,
      arrowScale: 0.7,
    },
    bodies: [
      makeBody({
        name: "Erde",
        mass: 5.972e24,
        physicalRadius: 6.371e6,
        drawRadius: 18,
        renderMode: "physical",
        color: "#4f8fdb",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: -(7.342e22 / 5.972e24) * 1022 },
      }),
      makeBody({
        name: "Mond",
        mass: 7.342e22,
        physicalRadius: 1.737e6,
        drawRadius: 8,
        renderMode: "physical",
        color: "#d8dde8",
        position: { x: 3.844e8, y: 0 },
        velocity: { x: 0, y: 1022 },
      }),
    ],
    presetFacts: [
      "Mittlerer Abstand Erde–Mond: 384 400 km",
      "Typische Bahngeschwindigkeit des Mondes: etwa 1,02 km/s",
      "Die Erde erhält eine kleine Gegengeschwindigkeit, damit der Schwerpunkt ruht",
    ],
  },
  {
    id: "sun-earth",
    name: "Sonne – Erde",
    description:
      "Die Erdbahn um die Sonne mit stark unterschiedlichen Massen und Distanzen. Schon kleine Änderungen an der Anfangsgeschwindigkeit verändern die Bahnform deutlich.",
    didactics:
      "Planetenbahnen entstehen aus dem Zusammenspiel von Trägheit und Gravitationskraft. Mit passender Geschwindigkeit ergibt sich eine gebundene Bahn.",
    editablePair: { anchorIndex: 0, bodyIndex: 1 },
    collisionMode: "stop-all",
    view: { mode: "body", bodyIndex: 0, scaleMetersPerPixel: 4.8e8 },
    recommended: {
      dt: 21600,
      speedFactor: 1152000,
      zoom: 1.0,
      trailLength: 10000,
      arrowScale: 0.35,
    },
    bodies: [
      makeBody({
        name: "Sonne",
        mass: 1.989e30,
        physicalRadius: 6.9634e8,
        drawRadius: 24,
        color: "#f0b547",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      }),
      makeBody({
        name: "Erde",
        mass: 5.972e24,
        physicalRadius: 6.371e6,
        drawRadius: 8,
        color: "#5aa4f0",
        position: { x: 1.496e11, y: 0 },
        velocity: { x: 0, y: 29780 },
      }),
    ],
    presetFacts: [
      "Mittlerer Abstand Sonne–Erde: 149,6 Mio. km",
      "Bahngeschwindigkeit der Erde: etwa 29,78 km/s",
      "Gut geeignet für Kreisbahn- und Ellipsenvergleiche",
    ],
  },
  {
    id: "sun-earth-moon",
    name: "Sonne – Erde – Mond",
    description:
      "Vereinfachtes Dreikörpersystem mit Sonne, Erde und Mond. Die Mondbahn ergibt sich aus der Überlagerung seiner Bewegung um die Erde mit der gemeinsamen Bewegung um die Sonne.",
    didactics:
      "Der Mond läuft nicht in einer einfachen Kreisbahn um die Sonne. Seine Bahn ist eine überlagerte Kurve im Gesamtsystem.",
    editablePair: { anchorIndex: 1, bodyIndex: 2 },
    collisionMode: "stop-all",
    view: { mode: "body", bodyIndex: 0, scaleMetersPerPixel: 4.8e8 },
    recommended: {
      dt: 14400,
      speedFactor: 1152000,
      zoom: 1.0,
      trailLength: 10000,
      arrowScale: 0.35,
    },
    bodies: [
      makeBody({
        name: "Sonne",
        mass: 1.989e30,
        physicalRadius: 6.9634e8,
        drawRadius: 24,
        color: "#f0b547",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      }),
      makeBody({
        name: "Erde",
        mass: 5.972e24,
        physicalRadius: 6.371e6,
        drawRadius: 8,
        color: "#5aa4f0",
        position: { x: 1.496e11, y: 0 },
        velocity: { x: 0, y: 29780 },
      }),
      makeBody({
        name: "Mond",
        mass: 7.342e22,
        physicalRadius: 1.737e6,
        drawRadius: 6,
        color: "#d8dde8",
        position: { x: 1.496e11 + 3.844e8, y: 0 },
        velocity: { x: 0, y: 29780 + 1022 },
      }),
    ],
    presetFacts: [
      "Erde und Mond bewegen sich gemeinsam um die Sonne",
      "Der Mond hat zusätzlich etwa 1,02 km/s relativ zur Erde",
      "Didaktisch gut für Überlagerung von Bewegungen",
    ],
  },
  {
    id: "speed-comparison",
    name: "Zu langsam / Kreisbahn / Fluchtbahn",
    description:
      "Drei Satelliten starten gleichzeitig auf derselben Höhe, aber mit unterschiedlicher Anfangsgeschwindigkeit. So werden Absturz, gebundene Bahn und Flucht direkt vergleichbar.",
    didactics:
      "Ob eine Bahn gebunden bleibt, hängt stark von der Startgeschwindigkeit ab. Geschwindigkeit und Energie entscheiden über Absturz, Umlauf oder Flucht.",
    editablePair: { anchorIndex: 0, bodyIndex: 2 },
    collisionMode: "freeze-non-central",
    view: { mode: "body", bodyIndex: 0, scaleMetersPerPixel: 30000 },
    recommended: {
      dt: 5,
      speedFactor: 360,
      zoom: 1.0,
      trailLength: 10000,
      arrowScale: 0.9,
      showForce: false,
    },
    bodies: [
      makeBody({
        name: "Erde",
        mass: 5.972e24,
        physicalRadius: 6.371e6,
        drawRadius: 22,
        renderMode: "physical",
        color: "#4f8fdb",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      }),
      makeBody({
        name: "Zu langsam",
        mass: 900,
        physicalRadius: 1200,
        drawRadius: 5,
        color: "#f08a7e",
        position: { x: 6.871228569e6, y: -8.28528187e5 },
        velocity: { x: 8.14043e2, y: 6.751099e3 },
      }),
      makeBody({
        name: "Kreisbahn",
        mass: 900,
        physicalRadius: 1200,
        drawRadius: 5,
        color: "#f2d66c",
        position: { x: 6.921e6, y: 0 },
        velocity: { x: 0, y: 7580 },
      }),
      makeBody({
        name: "Fluchtbahn",
        mass: 900,
        physicalRadius: 1200,
        drawRadius: 5,
        color: "#78d88b",
        position: { x: 6.871228569e6, y: 8.28528187e5 },
        velocity: { x: -1.32282e3, y: 1.0970535e4 },
      }),
    ],
    presetFacts: [
      "Alle Satelliten starten im gleichen Abstand",
      "Unterschiedlich ist nur die Anfangsgeschwindigkeit",
      "Vergleich zeigt direkt den Übergang von gebundener zu ungebundener Bahn",
    ],
  },
];

function getPresetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

window.GravitationPresets = {
  PRESETS,
  getPresetById,
};
