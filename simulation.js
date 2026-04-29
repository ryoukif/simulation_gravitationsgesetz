(() => {
const {
  DEFAULT_SOFTENING,
  appendTrail,
  clearTrails,
  cloneBodies,
  computeBarycenter,
  computeSystemEnergy,
  createSystemFromPreset,
  detectCollision,
  stepEulerCromer,
  stepVelocityVerlet,
} = window.GravitationPhysics;
const { getPresetById, PRESETS } = window.GravitationPresets;
const {
  buildPresetInfoHtml,
  formatDistanceMeters,
  formatScientific,
  formatTime,
  setBadgeText,
  updateIntegratorInfo,
} = window.GravitationUI;

const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");
const energyCanvas = document.getElementById("energyCanvas");
const energyCtx = energyCanvas.getContext("2d");

const elements = {
  canvasPanel: document.querySelector(".canvas-panel"),
  canvasToolbar: document.querySelector(".canvas-toolbar"),
  canvasLegend: document.querySelector(".canvas-legend"),
  toggleRunButton: document.getElementById("toggleRunButton"),
  resetButton: document.getElementById("resetButton"),
  applyButton: document.getElementById("applyButton"),
  clearTrailButton: document.getElementById("clearTrailButton"),
  presetSelect: document.getElementById("presetSelect"),
  presetDescription: document.getElementById("presetDescription"),
  integratorSelect: document.getElementById("integratorSelect"),
  dtInput: document.getElementById("dtInput"),
  speedFactorInput: document.getElementById("speedFactorInput"),
  zoomInput: document.getElementById("zoomInput"),
  zoomValueText: document.getElementById("zoomValueText"),
  trailLengthInput: document.getElementById("trailLengthInput"),
  arrowScaleInput: document.getElementById("arrowScaleInput"),
  distanceInput: document.getElementById("distanceInput"),
  speedInput: document.getElementById("speedInput"),
  centralMassInput: document.getElementById("centralMassInput"),
  satelliteMassInput: document.getElementById("satelliteMassInput"),
  showTrailInput: document.getElementById("showTrailInput"),
  showVelocityInput: document.getElementById("showVelocityInput"),
  showForceInput: document.getElementById("showForceInput"),
  showBarycenterInput: document.getElementById("showBarycenterInput"),
  showEnergyInput: document.getElementById("showEnergyInput"),
  showLabelsInput: document.getElementById("showLabelsInput"),
  statusText: document.getElementById("statusText"),
  simTimeText: document.getElementById("simTimeText"),
  editablePairText: document.getElementById("editablePairText"),
  activeIntegratorBadge: document.getElementById("activeIntegratorBadge"),
  viewScaleBadge: document.getElementById("viewScaleBadge"),
  scaleModeBadge: document.getElementById("scaleModeBadge"),
  integratorInfo: document.getElementById("integratorInfo"),
  kineticEnergyText: document.getElementById("kineticEnergyText"),
  potentialEnergyText: document.getElementById("potentialEnergyText"),
  totalEnergyText: document.getElementById("totalEnergyText"),
  presetDataBox: document.getElementById("presetDataBox"),
  energyPanel: document.getElementById("energyPanel"),
  distanceLabel: document.getElementById("distanceLabel"),
  speedLabel: document.getElementById("speedLabel"),
  centralMassLabel: document.getElementById("centralMassLabel"),
  satelliteMassLabel: document.getElementById("satelliteMassLabel"),
};

const state = {
  preset: PRESETS[0],
  bodies: [],
  baselineBodies: [],
  running: false,
  simulatedTime: 0,
  accumulator: 0,
  lastFrameTime: performance.now(),
  energyHistory: [],
  status: "Bereit",
  collisionMessage: "",
  controls: {
    integrator: "euler-cromer",
    dt: 5,
    speedFactor: 4500,
    zoom: 1,
    trailLength: 10000,
    arrowScale: 1,
    showTrail: true,
    showVelocity: true,
    showForce: true,
    showBarycenter: false,
    showEnergy: false,
    showLabels: true,
  },
  viewport: {
    dpr: 1,
    simulation: { width: 960, height: 720 },
    energy: { width: 960, height: 150 },
  },
};

function formatZoomFactor(value) {
  return `${value.toFixed(2).replace(".", ",")}×`;
}

function initializePresetSelect() {
  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    elements.presetSelect.append(option);
  }
}

function updateSpeedFactorStep(preset = state.preset) {
  const baseValue = preset?.recommended?.speedFactor ?? (Number(elements.speedFactorInput.value) || 1);
  const step = Math.max(1, Math.round(baseValue * 0.1));
  elements.speedFactorInput.step = String(step);
}

function getEditablePair() {
  return state.preset.editablePair;
}

function getEditableBodiesFromArray(bodyArray) {
  const pair = getEditablePair();
  return {
    anchor: bodyArray[pair.anchorIndex],
    body: bodyArray[pair.bodyIndex],
  };
}

function computeRelativeGeometry(anchor, body) {
  const rx = body.position.x - anchor.position.x;
  const ry = body.position.y - anchor.position.y;
  const distance = Math.hypot(rx, ry);
  const rHat = distance > 0 ? { x: rx / distance, y: ry / distance } : { x: 1, y: 0 };
  const tangent = { x: -rHat.y, y: rHat.x };

  const rvx = body.velocity.x - anchor.velocity.x;
  const rvy = body.velocity.y - anchor.velocity.y;
  const tangentSign = rvx * tangent.x + rvy * tangent.y >= 0 ? 1 : -1;

  return {
    distance,
    speed: Math.hypot(rvx, rvy),
    rHat,
    tangentHat: { x: tangent.x * tangentSign, y: tangent.y * tangentSign },
  };
}

function setControlValuesFromPreset(preset) {
  const editable = getEditableBodiesFromArray(preset.bodies);
  const geometry = computeRelativeGeometry(editable.anchor, editable.body);
  const centralName = editable.anchor.name;
  const bodyName = editable.body.name;

  elements.distanceLabel.textContent = `Anfangsabstand (${bodyName} zu ${centralName})`;
  elements.speedLabel.textContent = `Anfangsgeschwindigkeit (${bodyName})`;
  elements.centralMassLabel.textContent = `Masse des Zentralkörpers (${centralName})`;
  elements.satelliteMassLabel.textContent = `Masse des zweiten Körpers (${bodyName})`;

  elements.distanceInput.value = geometry.distance.toFixed(0);
  elements.speedInput.value = geometry.speed.toFixed(2);
  elements.centralMassInput.value = editable.anchor.mass.toExponential(6);
  elements.satelliteMassInput.value = editable.body.mass.toExponential(6);
  elements.dtInput.value = String(preset.recommended.dt);
  elements.speedFactorInput.value = String(preset.recommended.speedFactor);
  updateSpeedFactorStep(preset);
  elements.zoomInput.value = String(preset.recommended.zoom);
  elements.trailLengthInput.value = String(preset.recommended.trailLength);
  elements.arrowScaleInput.value = String(preset.recommended.arrowScale);
  elements.showForceInput.checked = preset.recommended.showForce ?? true;
}

function readControls() {
  state.controls.integrator = elements.integratorSelect.value;
  state.controls.dt = Math.max(0.0001, Number(elements.dtInput.value) || state.preset.recommended.dt);
  state.controls.speedFactor = Math.max(
    0.01,
    Number(elements.speedFactorInput.value) || state.preset.recommended.speedFactor,
  );
  state.controls.zoom = Math.max(0.05, Number(elements.zoomInput.value) || state.preset.recommended.zoom);
  state.controls.trailLength = Math.max(
    0,
    Math.round(Number(elements.trailLengthInput.value) || state.preset.recommended.trailLength),
  );
  state.controls.arrowScale = Math.max(
    0.01,
    Number(elements.arrowScaleInput.value) || state.preset.recommended.arrowScale,
  );
  state.controls.showTrail = elements.showTrailInput.checked;
  state.controls.showVelocity = elements.showVelocityInput.checked;
  state.controls.showForce = elements.showForceInput.checked;
  state.controls.showBarycenter = elements.showBarycenterInput.checked;
  state.controls.showEnergy = elements.showEnergyInput.checked;
  state.controls.showLabels = elements.showLabelsInput.checked;
}

function createBodiesFromCurrentInputs() {
  const presetBodies = cloneBodies(state.preset.bodies);
  const { anchor, body } = getEditableBodiesFromArray(presetBodies);
  const geometry = computeRelativeGeometry(anchor, body);

  const targetDistance = Math.max(1, Number(elements.distanceInput.value) || geometry.distance);
  const targetSpeed = Math.max(0, Number(elements.speedInput.value) || geometry.speed);
  const centralMass = Math.max(1, Number(elements.centralMassInput.value) || anchor.mass);
  const bodyMass = Math.max(1, Number(elements.satelliteMassInput.value) || body.mass);

  anchor.mass = centralMass;
  body.mass = bodyMass;
  body.position.x = anchor.position.x + geometry.rHat.x * targetDistance;
  body.position.y = anchor.position.y + geometry.rHat.y * targetDistance;
  const relativeVelocity = {
    x: geometry.tangentHat.x * targetSpeed,
    y: geometry.tangentHat.y * targetSpeed,
  };

  if (state.preset.referenceFrame === "barycenter") {
    anchor.velocity.x = -(body.mass / anchor.mass) * relativeVelocity.x;
    anchor.velocity.y = -(body.mass / anchor.mass) * relativeVelocity.y;
    body.velocity.x = anchor.velocity.x + relativeVelocity.x;
    body.velocity.y = anchor.velocity.y + relativeVelocity.y;
  } else {
    body.velocity.x = anchor.velocity.x + relativeVelocity.x;
    body.velocity.y = anchor.velocity.y + relativeVelocity.y;
  }

  return createSystemFromPreset({
    ...state.preset,
    bodies: presetBodies,
    recommended: {
      ...state.preset.recommended,
      trailLength: state.controls.trailLength,
    },
  });
}

function applyCurrentInputsAndReset() {
  readControls();
  state.baselineBodies = createBodiesFromCurrentInputs();
  resetSimulation();
  state.status = "Neu gestartet";
  updateUiStatus();
}

function loadPreset(presetId) {
  state.preset = getPresetById(presetId);
  elements.presetSelect.value = state.preset.id;
  elements.presetDescription.textContent = state.preset.description;
  elements.presetDataBox.innerHTML = buildPresetInfoHtml(state.preset);
  if (typeof window.renderMathContent === "function") {
    window.renderMathContent(elements.presetDataBox);
  }
  setControlValuesFromPreset(state.preset);
  readControls();
  updateIntegratorInfo(elements.integratorInfo, state.controls.integrator);
  state.status = "Preset geladen";
  state.baselineBodies = createSystemFromPreset(state.preset);
  resetSimulation();
  updateUiStatus();
}

function resetSimulation() {
  state.running = false;
  state.accumulator = 0;
  state.simulatedTime = 0;
  state.energyHistory = [];
  state.collisionMessage = "";
  elements.toggleRunButton.textContent = "Start";

  const sourceBodies =
    state.baselineBodies.length > 0
      ? cloneBodies(state.baselineBodies)
      : createSystemFromPreset(state.preset);
  state.bodies = sourceBodies;
  clearTrails(state.bodies);
  updateUiStatus();
  updateEnergyDisplay();
  drawFrame();
}

function resetToPresetDefaults() {
  setControlValuesFromPreset(state.preset);
  updateSpeedFactorStep(state.preset);
  readControls();
  state.baselineBodies = createSystemFromPreset(state.preset);
  state.status = "Preset zurückgesetzt";
  resetSimulation();
  updateUiStatus();
}

function clearOnlyTrails() {
  clearTrails(state.bodies);
  state.energyHistory = [];
  state.status = "Bahnspur gelöscht";
  updateEnergyDisplay();
  updateUiStatus();
  drawFrame();
}

function updateUiStatus() {
  const pair = getEditableBodiesFromArray(state.bodies);
  elements.statusText.textContent = state.status;
  elements.simTimeText.textContent = formatTime(state.simulatedTime);
  elements.editablePairText.textContent = `${pair.body.name} um ${pair.anchor.name}`;
  setBadgeText(
    elements.activeIntegratorBadge,
    `Aktiv: ${state.controls.integrator === "velocity-verlet" ? "Velocity-Verlet" : "Euler-Cromer"}`,
  );
  setBadgeText(
    elements.viewScaleBadge,
    `Zoom ${formatZoomFactor(state.controls.zoom)}`,
  );
  setBadgeText(elements.scaleModeBadge, `Darstellung: ${getScaleModeLabel()}`);
  if (elements.zoomValueText) {
    elements.zoomValueText.textContent = formatZoomFactor(state.controls.zoom);
  }
  updateIntegratorInfo(elements.integratorInfo, state.controls.integrator);
  elements.energyPanel.hidden = !state.controls.showEnergy;
}

function getScaleModeLabel() {
  const hasPhysical = state.bodies.some((body) => body.renderMode === "physical");
  const hasSymbolic = state.bodies.some((body) => body.renderMode !== "physical");

  if (hasPhysical && hasSymbolic) {
    return "Bahn/Erde maßstäblich, Satelliten vergrößert";
  }
  if (hasPhysical) {
    return "maßstäblich";
  }
  return "nicht maßstäblich";
}

function freezeBodyOnCollision(body, otherBody) {
  const dx = body.position.x - otherBody.position.x;
  const dy = body.position.y - otherBody.position.y;
  const distance = Math.hypot(dx, dy);
  const contactDistance = (body.physicalRadius ?? 0) + (otherBody.physicalRadius ?? 0);

  if (distance > 0 && contactDistance > 0) {
    const scale = contactDistance / distance;
    body.position.x = otherBody.position.x + dx * scale;
    body.position.y = otherBody.position.y + dy * scale;
  }

  body.velocity.x = 0;
  body.velocity.y = 0;
  body.acceleration.x = 0;
  body.acceleration.y = 0;
  body.force.x = 0;
  body.force.y = 0;
  body.collided = true;
  const lastTrailPoint = body.trail[body.trail.length - 1];
  if (
    !lastTrailPoint ||
    lastTrailPoint.x !== body.position.x ||
    lastTrailPoint.y !== body.position.y
  ) {
    body.trail.push({ x: body.position.x, y: body.position.y });
  }
}

function getViewCenter() {
  if (state.preset.view.mode === "barycenter") {
    return computeBarycenter(state.bodies);
  }
  const body = state.bodies[state.preset.view.bodyIndex] ?? state.bodies[0];
  return { x: body.position.x, y: body.position.y };
}

function getMetersPerPixel() {
  return state.preset.view.scaleMetersPerPixel / state.controls.zoom;
}

function getBodyScreenRadius(body) {
  if (body.renderMode === "physical") {
    return Math.max(0.75, body.physicalRadius / getMetersPerPixel());
  }
  return body.drawRadius;
}

function drawBodyLabel(body, position, radius) {
  const isLargePhysicalBody = body.renderMode === "physical" && radius > 40;
  const label = body.collided ? `${body.name} (abgestürzt)` : body.name;

  ctx.fillStyle = "#eef6ff";
  ctx.font = "13px Segoe UI";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  if (isLargePhysicalBody) {
    const inset = Math.max(18, radius * 0.12);
    ctx.textAlign = "center";
    ctx.fillText(label, position.x, position.y - radius + inset);
    return;
  }

  ctx.fillText(label, position.x + radius + 7, position.y - radius - 5);
}

function drawVector(origin, vector, color, label) {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return;
  }

  const scaledLength = Math.min(120, Math.log10(length + 1) * 11 * state.controls.arrowScale);
  const dirX = vector.x / length;
  const dirY = vector.y / length;
  const endX = origin.x + dirX * scaledLength;
  const endY = origin.y - dirY * scaledLength;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const angle = Math.atan2(origin.y - endY, endX - origin.x);
  const headSize = 8;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headSize * Math.cos(angle - Math.PI / 6),
    endY + headSize * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    endX - headSize * Math.cos(angle + Math.PI / 6),
    endY + headSize * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();

  ctx.font = "12px Segoe UI";
  ctx.fillText(label, endX + 8, endY - 8);
  ctx.restore();
}

function drawTrails(center) {
  if (!state.controls.showTrail) {
    return;
  }

  for (const body of state.bodies) {
    if (body.trail.length < 2) {
      continue;
    }
    ctx.save();
    ctx.strokeStyle = `${body.color}88`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    body.trail.forEach((point, index) => {
      const screen = worldToScreen(point, center);
      if (index === 0) {
        ctx.moveTo(screen.x, screen.y);
      } else {
        ctx.lineTo(screen.x, screen.y);
      }
    });
    ctx.stroke();
    ctx.restore();
  }
}

function drawBodies(center) {
  for (const body of state.bodies) {
    const position = worldToScreen(body.position, center);
    const radius = getBodyScreenRadius(body);
    ctx.save();
    ctx.fillStyle = body.collided ? "#c45b5b" : body.color;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (body.collided) {
      ctx.strokeStyle = "#ffd6d6";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (state.controls.showLabels) {
      drawBodyLabel(body, position, radius);
    }

    if (state.controls.showVelocity) {
      drawVector(position, body.velocity, "#5ec5ff", "v");
    }
    if (state.controls.showForce) {
      drawVector(position, body.force, "#ffb15a", "F_G");
    }
    ctx.restore();
  }
}

function drawBarycenter(center) {
  if (!state.controls.showBarycenter) {
    return;
  }
  const barycenter = computeBarycenter(state.bodies);
  const position = worldToScreen(barycenter, center);
  ctx.save();
  ctx.strokeStyle = "#b4ff7a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(position.x - 8, position.y);
  ctx.lineTo(position.x + 8, position.y);
  ctx.moveTo(position.x, position.y - 8);
  ctx.lineTo(position.x, position.y + 8);
  ctx.stroke();
  ctx.fillStyle = "#d8ffc0";
  ctx.font = "12px Segoe UI";
  ctx.fillText("Schwerpunkt", position.x + 10, position.y - 10);
  ctx.restore();
}

function updateEnergyDisplay() {
  const energy = computeSystemEnergy(state.bodies, state.preset.softening ?? DEFAULT_SOFTENING);
  elements.kineticEnergyText.textContent = formatScientific(energy.kinetic, "J");
  elements.potentialEnergyText.textContent = formatScientific(energy.potential, "J");
  elements.totalEnergyText.textContent = formatScientific(energy.total, "J");

  const lastEntry = state.energyHistory[state.energyHistory.length - 1];
  if (!lastEntry || lastEntry.t !== state.simulatedTime) {
    state.energyHistory.push({ t: state.simulatedTime, ...energy });
    if (state.energyHistory.length > 240) {
      state.energyHistory.splice(0, state.energyHistory.length - 240);
    }
  }

  drawEnergyChart();
}

function simulationStep(dt) {
  if (state.controls.integrator === "velocity-verlet") {
    stepVelocityVerlet(state.bodies, dt, state.preset.softening ?? DEFAULT_SOFTENING);
  } else {
    stepEulerCromer(state.bodies, dt, state.preset.softening ?? DEFAULT_SOFTENING);
  }
  appendTrail(state.bodies, state.controls.trailLength);
  state.simulatedTime += dt;

  const collision = detectCollision(state.bodies);
  if (collision) {
    handleCollision(collision);
  }
}

function toggleRunning() {
  state.running = !state.running;
  state.status = state.running ? "Simulation läuft" : "Pausiert";
  state.collisionMessage = "";
  elements.toggleRunButton.textContent = state.running ? "Pause" : "Start";
  updateUiStatus();
}

function handleCollision(collision) {
  const [indexA, indexB] = collision.indices;
  const bodyA = state.bodies[indexA];
  const bodyB = state.bodies[indexB];
  const mode = state.preset.collisionMode ?? "stop-all";

  if (mode === "stop-all") {
    state.running = false;
    state.collisionMessage = "Kollision";
    state.status = state.collisionMessage;
    elements.toggleRunButton.textContent = "Start";
    return;
  }

  const freezeTargets = [];

  if (mode === "freeze-secondary") {
    const secondaryIndex = state.preset.editablePair?.bodyIndex;
    if (indexA === secondaryIndex && !bodyA.fixed) {
      freezeTargets.push({ target: bodyA, other: bodyB });
    }
    if (indexB === secondaryIndex && !bodyB.fixed) {
      freezeTargets.push({ target: bodyB, other: bodyA });
    }
  } else if (mode === "freeze-non-central") {
    const centralIndex = state.preset.editablePair?.anchorIndex;
    if (indexA !== centralIndex && !bodyA.fixed) {
      freezeTargets.push({ target: bodyA, other: bodyB });
    }
    if (indexB !== centralIndex && !bodyB.fixed) {
      freezeTargets.push({ target: bodyB, other: bodyA });
    }
  } else {
    if (!bodyA.fixed) {
      freezeTargets.push({ target: bodyA, other: bodyB });
    }
    if (!bodyB.fixed) {
      freezeTargets.push({ target: bodyB, other: bodyA });
    }
  }

  if (freezeTargets.length === 0) {
    state.running = false;
    state.collisionMessage = "Kollision";
    state.status = state.collisionMessage;
    elements.toggleRunButton.textContent = "Start";
    return;
  }

  for (const entry of freezeTargets) {
    freezeBodyOnCollision(entry.target, entry.other);
  }

  state.collisionMessage = "Kollision";
  state.status = state.collisionMessage;
}

function worldToScreen(point, center) {
  const metersPerPixel = state.preset.view.scaleMetersPerPixel / state.controls.zoom;
  return {
    x: state.viewport.simulation.width / 2 + (point.x - center.x) / metersPerPixel,
    y: state.viewport.simulation.height / 2 - (point.y - center.y) / metersPerPixel,
  };
}

function drawScaleAndHints(center) {
  const pair = getEditableBodiesFromArray(state.bodies);
  const geometry = computeRelativeGeometry(pair.anchor, pair.body);
  ctx.save();
  ctx.fillStyle = "rgba(235, 244, 255, 0.88)";
  ctx.font = "14px Segoe UI";
  ctx.fillText(`Abstand: ${formatDistanceMeters(geometry.distance)}`, 16, 26);
  ctx.fillText(`Geschwindigkeit: ${formatScientific(geometry.speed, "m/s")}`, 16, 48);
  ctx.fillText(`Δt: ${formatScientific(state.controls.dt, "s")}`, 16, 70);
  ctx.fillText(
    "Hinweis: Kraft zeigt radial, Geschwindigkeit tangential zur Bahn.",
    16,
    state.viewport.simulation.height - 18,
  );

  const anchorScreen = worldToScreen(pair.anchor.position, center);
  const bodyScreen = worldToScreen(pair.body.position, center);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(anchorScreen.x, anchorScreen.y);
  ctx.lineTo(bodyScreen.x, bodyScreen.y);
  ctx.stroke();
  ctx.restore();
}

function drawFrame() {
  if (state.bodies.length === 0) {
    ctx.clearRect(0, 0, state.viewport.simulation.width, state.viewport.simulation.height);
    return;
  }
  const center = getViewCenter();
  ctx.clearRect(0, 0, state.viewport.simulation.width, state.viewport.simulation.height);
  drawTrails(center);
  drawBodies(center);
  drawBarycenter(center);
  drawScaleAndHints(center);
}

function drawEnergyChart() {
  const width = state.viewport.energy.width;
  const height = state.viewport.energy.height;
  energyCtx.clearRect(0, 0, width, height);
  energyCtx.fillStyle = "#fbfcfe";
  energyCtx.fillRect(0, 0, width, height);

  energyCtx.strokeStyle = "#d3dce8";
  energyCtx.lineWidth = 1;
  for (let y = 0; y <= 4; y += 1) {
    const py = 18 + (y / 4) * (height - 36);
    energyCtx.beginPath();
    energyCtx.moveTo(40, py);
    energyCtx.lineTo(width - 12, py);
    energyCtx.stroke();
  }

  if (state.energyHistory.length < 2) {
    energyCtx.fillStyle = "#607086";
    energyCtx.font = "14px Segoe UI";
    energyCtx.fillText("Energiekurve erscheint nach den ersten Simulationsschritten.", 42, height / 2);
    return;
  }

  const values = [];
  for (const entry of state.energyHistory) {
    values.push(entry.kinetic, entry.potential, entry.total);
  }
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const plotX = (index) => 40 + (index / (state.energyHistory.length - 1)) * (width - 52);
  const plotY = (value) => {
    const normalized = (value - min) / (max - min);
    return height - 18 - normalized * (height - 36);
  };

  const drawSeries = (key, color) => {
    energyCtx.strokeStyle = color;
    energyCtx.lineWidth = 2;
    energyCtx.beginPath();
    state.energyHistory.forEach((entry, index) => {
      const x = plotX(index);
      const y = plotY(entry[key]);
      if (index === 0) {
        energyCtx.moveTo(x, y);
      } else {
        energyCtx.lineTo(x, y);
      }
    });
    energyCtx.stroke();
  };

  drawSeries("kinetic", "#4da3ff");
  drawSeries("potential", "#ffad66");
  drawSeries("total", "#2a8b55");

  energyCtx.fillStyle = "#516173";
  energyCtx.font = "13px Segoe UI";
  energyCtx.fillText("E_kin", 42, 18);
  energyCtx.fillStyle = "#4da3ff";
  energyCtx.fillRect(82, 10, 18, 3);
  energyCtx.fillStyle = "#516173";
  energyCtx.fillText("E_pot", 116, 18);
  energyCtx.fillStyle = "#ffad66";
  energyCtx.fillRect(158, 10, 18, 3);
  energyCtx.fillStyle = "#516173";
  energyCtx.fillText("E_ges", 194, 18);
  energyCtx.fillStyle = "#2a8b55";
  energyCtx.fillRect(238, 10, 18, 3);
}

function animate(now) {
  const elapsedRealSeconds = Math.min(0.05, (now - state.lastFrameTime) / 1000);
  state.lastFrameTime = now;

  if (state.running) {
    state.accumulator += elapsedRealSeconds * state.controls.speedFactor;
    const maxSteps = 160;
    let stepCount = 0;

    while (state.accumulator >= state.controls.dt && stepCount < maxSteps && state.running) {
      simulationStep(state.controls.dt);
      state.accumulator -= state.controls.dt;
      stepCount += 1;
    }

    if (stepCount === maxSteps && state.accumulator >= state.controls.dt) {
      state.accumulator = 0;
      state.status = "Tempo begrenzt, damit die Darstellung flüssig bleibt";
    } else if (!state.collisionMessage) {
      state.status = "Simulation läuft";
    } else {
      state.status = state.collisionMessage;
    }
  }

  updateUiStatus();
  updateEnergyDisplay();
  drawFrame();
  requestAnimationFrame(animate);
}

function bindEvents() {
  elements.toggleRunButton.addEventListener("click", toggleRunning);
  elements.resetButton.addEventListener("click", resetToPresetDefaults);
  elements.applyButton.addEventListener("click", applyCurrentInputsAndReset);
  elements.clearTrailButton.addEventListener("click", clearOnlyTrails);
  elements.presetSelect.addEventListener("change", () => loadPreset(elements.presetSelect.value));
  elements.integratorSelect.addEventListener("change", () => {
    readControls();
    updateUiStatus();
  });

  [
    elements.dtInput,
    elements.speedFactorInput,
    elements.zoomInput,
    elements.trailLengthInput,
    elements.arrowScaleInput,
    elements.showTrailInput,
    elements.showVelocityInput,
    elements.showForceInput,
    elements.showBarycenterInput,
    elements.showEnergyInput,
    elements.showLabelsInput,
  ].forEach((element) => {
    element.addEventListener("input", () => {
      readControls();
      updateUiStatus();
      if (element === elements.showEnergyInput) {
        resizeCanvases();
        if (elements.showEnergyInput.checked) {
          requestAnimationFrame(() => {
            elements.energyPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
      }
      drawFrame();
    });
  });

  window.addEventListener("resize", resizeCanvases);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvases);
  }
}

function configureCanvas(canvasElement, context, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
  const backingHeight = Math.max(1, Math.round(cssHeight * dpr));

  if (canvasElement.style.height !== `${cssHeight}px`) {
    canvasElement.style.height = `${cssHeight}px`;
  }
  canvasElement.width = backingWidth;
  canvasElement.height = backingHeight;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { width: cssWidth, height: cssHeight, dpr };
}

function resizeCanvases() {
  const currentRect = canvas.getBoundingClientRect();
  const panelHeight = elements.canvasPanel?.clientHeight || Math.round(currentRect.height);
  const toolbarHeight = elements.canvasToolbar?.getBoundingClientRect().height ?? 0;
  const legendHeight = elements.canvasLegend?.getBoundingClientRect().height ?? 0;
  const simulationWidth = Math.max(640, Math.round(currentRect.width));
  const simulationHeight = Math.max(420, Math.round(panelHeight - toolbarHeight - legendHeight));
  const simulationViewport = configureCanvas(canvas, ctx, simulationWidth, simulationHeight);

  const energyRect = elements.energyPanel.hidden ? { width: simulationWidth } : energyCanvas.getBoundingClientRect();
  const energyWidth = Math.max(320, Math.round(energyRect.width || simulationWidth));
  const energyViewport = configureCanvas(energyCanvas, energyCtx, energyWidth, 150);

  state.viewport = {
    dpr: simulationViewport.dpr,
    simulation: simulationViewport,
    energy: energyViewport,
  };

  drawFrame();
  drawEnergyChart();
}

function bootstrap() {
  initializePresetSelect();
  bindEvents();
  loadPreset(PRESETS[0].id);
  resizeCanvases();
  readControls();
  updateUiStatus();
  requestAnimationFrame((now) => {
    state.lastFrameTime = now;
    requestAnimationFrame(animate);
  });
}

bootstrap();
})();
