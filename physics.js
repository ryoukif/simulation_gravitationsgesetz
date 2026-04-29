const G = 6.6743e-11;
const DEFAULT_SOFTENING = 5e5;

function vectorLength(x, y) {
  return Math.hypot(x, y);
}

function cloneBodies(bodies) {
  return bodies.map((body) => ({
    ...body,
    position: { ...body.position },
    velocity: { ...body.velocity },
    acceleration: body.acceleration ? { ...body.acceleration } : { x: 0, y: 0 },
    force: body.force ? { ...body.force } : { x: 0, y: 0 },
    trail: Array.isArray(body.trail)
      ? body.trail.map((point) => ({ ...point }))
      : [],
  }));
}

function createSystemFromPreset(preset) {
  const bodies = cloneBodies(preset.bodies).map((body) => ({
    ...body,
    trail: [],
    acceleration: { x: 0, y: 0 },
    force: { x: 0, y: 0 },
    collided: false,
  }));
  const initial = computeAccelerationData(bodies, preset.softening ?? DEFAULT_SOFTENING);
  applyAccelerationData(bodies, initial);
  appendTrail(bodies, preset.recommended?.trailLength ?? 800);
  return bodies;
}

function computeAccelerationData(bodies, softening = DEFAULT_SOFTENING) {
  const accelerations = bodies.map(() => ({ x: 0, y: 0 }));
  const forces = bodies.map(() => ({ x: 0, y: 0 }));

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const bodyA = bodies[i];
      const bodyB = bodies[j];
      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const distanceSquared = dx * dx + dy * dy + softening * softening;
      const distance = Math.sqrt(distanceSquared);
      const invDistanceCubed = 1 / (distanceSquared * distance);

      const ax = G * bodyB.mass * dx * invDistanceCubed;
      const ay = G * bodyB.mass * dy * invDistanceCubed;
      const bx = -G * bodyA.mass * dx * invDistanceCubed;
      const by = -G * bodyA.mass * dy * invDistanceCubed;

      accelerations[i].x += ax;
      accelerations[i].y += ay;
      accelerations[j].x += bx;
      accelerations[j].y += by;

      const fx = G * bodyA.mass * bodyB.mass * dx * invDistanceCubed;
      const fy = G * bodyA.mass * bodyB.mass * dy * invDistanceCubed;

      forces[i].x += fx;
      forces[i].y += fy;
      forces[j].x -= fx;
      forces[j].y -= fy;
    }
  }

  return { accelerations, forces };
}

function applyAccelerationData(bodies, data) {
  bodies.forEach((body, index) => {
    body.acceleration = { ...data.accelerations[index] };
    body.force = { ...data.forces[index] };
  });
}

function stepEulerCromer(bodies, dt, softening = DEFAULT_SOFTENING) {
  const startData = computeAccelerationData(bodies, softening);
  applyAccelerationData(bodies, startData);

  for (const body of bodies) {
    if (body.fixed || body.collided) {
      continue;
    }
    body.velocity.x += body.acceleration.x * dt;
    body.velocity.y += body.acceleration.y * dt;
    body.position.x += body.velocity.x * dt;
    body.position.y += body.velocity.y * dt;
  }

  const endData = computeAccelerationData(bodies, softening);
  applyAccelerationData(bodies, endData);
}

function stepVelocityVerlet(bodies, dt, softening = DEFAULT_SOFTENING) {
  const startData = computeAccelerationData(bodies, softening);
  applyAccelerationData(bodies, startData);
  const previousAccelerations = bodies.map((body) => ({ ...body.acceleration }));

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    if (body.fixed || body.collided) {
      continue;
    }
    const acc = previousAccelerations[index];
    body.position.x += body.velocity.x * dt + 0.5 * acc.x * dt * dt;
    body.position.y += body.velocity.y * dt + 0.5 * acc.y * dt * dt;
  }

  const endData = computeAccelerationData(bodies, softening);

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    if (body.fixed || body.collided) {
      continue;
    }
    const previous = previousAccelerations[index];
    const next = endData.accelerations[index];
    body.velocity.x += 0.5 * (previous.x + next.x) * dt;
    body.velocity.y += 0.5 * (previous.y + next.y) * dt;
  }

  applyAccelerationData(bodies, endData);
}

function appendTrail(bodies, maxLength) {
  for (const body of bodies) {
    if ((body.fixed || body.collided) && body.trail.length > 0) {
      continue;
    }
    body.trail.push({ x: body.position.x, y: body.position.y });
    if (maxLength > 0 && body.trail.length > maxLength) {
      body.trail.splice(0, body.trail.length - maxLength);
    }
  }
}

function clearTrails(bodies) {
  for (const body of bodies) {
    body.trail = [{ x: body.position.x, y: body.position.y }];
  }
}

function computeBarycenter(bodies) {
  let totalMass = 0;
  let x = 0;
  let y = 0;

  for (const body of bodies) {
    totalMass += body.mass;
    x += body.position.x * body.mass;
    y += body.position.y * body.mass;
  }

  return totalMass > 0 ? { x: x / totalMass, y: y / totalMass } : { x: 0, y: 0 };
}

function computeSystemEnergy(bodies, softening = DEFAULT_SOFTENING) {
  let kinetic = 0;
  let potential = 0;

  for (const body of bodies) {
    const speedSquared = body.velocity.x ** 2 + body.velocity.y ** 2;
    kinetic += 0.5 * body.mass * speedSquared;
  }

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const dx = bodies[j].position.x - bodies[i].position.x;
      const dy = bodies[j].position.y - bodies[i].position.y;
      const distance = Math.sqrt(dx * dx + dy * dy + softening * softening);
      potential += -G * bodies[i].mass * bodies[j].mass / distance;
    }
  }

  return {
    kinetic,
    potential,
    total: kinetic + potential,
  };
}

function detectCollision(bodies) {
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const bodyA = bodies[i];
      const bodyB = bodies[j];
      if (bodyA.collided || bodyB.collided) {
        continue;
      }
      const distance = vectorLength(
        bodyB.position.x - bodyA.position.x,
        bodyB.position.y - bodyA.position.y,
      );
      const limit = (bodyA.physicalRadius ?? 0) + (bodyB.physicalRadius ?? 0);
      if (limit > 0 && distance <= limit) {
        return { pair: [bodyA.name, bodyB.name], distance, indices: [i, j] };
      }
    }
  }

  return null;
}

window.GravitationPhysics = {
  G,
  DEFAULT_SOFTENING,
  cloneBodies,
  createSystemFromPreset,
  computeAccelerationData,
  applyAccelerationData,
  stepEulerCromer,
  stepVelocityVerlet,
  appendTrail,
  clearTrails,
  computeBarycenter,
  computeSystemEnergy,
  detectCollision,
};
