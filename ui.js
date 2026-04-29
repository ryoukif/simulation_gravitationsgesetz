const INTEGRATOR_INFO = {
  "euler-cromer":
    "Euler-Cromer aktualisiert zuerst die Geschwindigkeit und dann die Position. Das Verfahren ist anschaulich, aber auf lange Sicht energieseitig weniger stabil.",
  "velocity-verlet":
    "Velocity-Verlet nutzt die Beschleunigung vor und nach dem Schritt. Für Orbit-Simulationen bleibt die Energie meist deutlich stabiler.",
};

function formatScientific(value, unit = "") {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const absolute = Math.abs(value);
  const formatted =
    absolute !== 0 && (absolute >= 1e5 || absolute < 1e-2)
      ? value.toExponential(3)
      : new Intl.NumberFormat("de-DE", {
          maximumFractionDigits: absolute >= 100 ? 0 : 3,
        }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDistanceMeters(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(3).replace(".", ",")} Gm`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(3).replace(".", ",")} Mm`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(1).replace(".", ",")} km`;
  }
  return `${value.toFixed(1).replace(".", ",")} m`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "—";
  }
  const absolute = Math.abs(seconds);
  if (absolute >= 86400) {
    return `${(seconds / 86400).toFixed(2).replace(".", ",")} d`;
  }
  if (absolute >= 3600) {
    return `${(seconds / 3600).toFixed(2).replace(".", ",")} h`;
  }
  if (absolute >= 60) {
    return `${(seconds / 60).toFixed(2).replace(".", ",")} min`;
  }
  return `${seconds.toFixed(1).replace(".", ",")} s`;
}

function setBadgeText(element, text) {
  element.textContent = text;
}

function formatGermanDecimal(value, fractionDigits = 3) {
  return value.toFixed(fractionDigits).replace(".", "{,}");
}

function formatLatexNumber(value, fractionDigits = 3) {
  if (!Number.isFinite(value)) {
    return "\\text{—}";
  }

  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute >= 1e4 || absolute < 1e-2)) {
    const exponent = Math.floor(Math.log10(absolute));
    const mantissa = value / 10 ** exponent;
    return `${formatGermanDecimal(mantissa, fractionDigits)} \\cdot 10^{${exponent}}`;
  }

  if (absolute >= 100) {
    return new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: 0,
    }).format(value).replace(",", "{,}");
  }

  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value).replace(",", "{,}");
}

function formatLatexQuantity(value, unitLatex, fractionDigits = 3) {
  return `${formatLatexNumber(value, fractionDigits)}\\,${unitLatex}`;
}

function computeMagnitude(vector) {
  return Math.hypot(vector.x, vector.y);
}

function computePresetPairMetrics(preset) {
  const pair = preset.editablePair;
  const anchor = preset.bodies[pair.anchorIndex];
  const body = preset.bodies[pair.bodyIndex];
  const dx = body.position.x - anchor.position.x;
  const dy = body.position.y - anchor.position.y;
  const dvx = body.velocity.x - anchor.velocity.x;
  const dvy = body.velocity.y - anchor.velocity.y;

  return {
    anchor,
    body,
    distance: Math.hypot(dx, dy),
    relativeSpeed: Math.hypot(dvx, dvy),
  };
}

function buildPresetInfoHtml(preset) {
  const pairMetrics = computePresetPairMetrics(preset);
  const bodyData = preset.bodies
    .map((body) => {
      const speed = computeMagnitude(body.velocity);
      const extra = body.fixed ? ",\\; \\text{fest}" : "";
      return `
        <li>
          <strong>${body.name}</strong>:
          \\(
            m = ${formatLatexQuantity(body.mass, "\\mathrm{kg}", 3)},
            \\;
            R = ${formatLatexQuantity(body.physicalRadius, "\\mathrm{m}", 3)},
            \\;
            |\\vec v_0| = ${formatLatexQuantity(speed, "\\mathrm{m/s}", 3)}
            ${extra}
          \\)
        </li>
      `;
    })
    .join("");
  const facts = preset.presetFacts.map((fact) => `<li>${fact}</li>`).join("");
  return `
    <p><strong>${preset.name}</strong></p>
    <p>${preset.description}</p>
    <p><strong>Didaktische Kurzdeutung:</strong> ${preset.didactics}</p>
    <p><strong>Beteiligte Körper:</strong></p>
    <ul>${bodyData}</ul>
    <p><strong>Empfohlene Werte:</strong></p>
    <ul>
      <li>\\(\\Delta t = ${formatLatexQuantity(preset.recommended.dt, "\\mathrm{s}", 3)}\\)</li>
      <li>\\(f_t = ${formatLatexQuantity(preset.recommended.speedFactor, "\\mathrm{s/s}", 3)}\\)</li>
      <li>\\(z = ${formatLatexNumber(preset.recommended.zoom, 2)}\\)</li>
      <li>\\(L_{\\text{Spur}} = ${preset.recommended.trailLength === 0 ? "\\infty" : formatLatexNumber(preset.recommended.trailLength, 0)}\\)</li>
      <li>\\(s_{\\text{Pfeil}} = ${formatLatexNumber(preset.recommended.arrowScale, 2)}\\)</li>
    </ul>
    <p><strong>Wichtige Startgrößen:</strong></p>
    <ul>
      <li>
        Abstand ${pairMetrics.body.name} zu ${pairMetrics.anchor.name}:
        \\(r_0 = ${formatLatexQuantity(pairMetrics.distance, "\\mathrm{m}", 3)}\\)
      </li>
      <li>
        Relative Startgeschwindigkeit:
        \\(|\\vec v_{0,\\text{rel}}| = ${formatLatexQuantity(pairMetrics.relativeSpeed, "\\mathrm{m/s}", 3)}\\)
      </li>
    </ul>
    <p><strong>Wichtige Daten:</strong></p>
    <ul>${facts}</ul>
  `;
}

function updateIntegratorInfo(element, integratorKey) {
  element.textContent = INTEGRATOR_INFO[integratorKey] ?? "";
}

window.GravitationUI = {
  INTEGRATOR_INFO,
  formatScientific,
  formatDistanceMeters,
  formatTime,
  formatLatexNumber,
  formatLatexQuantity,
  setBadgeText,
  buildPresetInfoHtml,
  updateIntegratorInfo,
};
