/* =====================================================
   12ROM ANALYZE.JS – FULL EXPERIMENT VERSION
   ===================================================== */

/* ===== ROM / BUILD INFO ===== */
window.__ANALYZE_ROM_ID__ = "12ROM";
window.__ANALYZE_VERSION__ = "v1.0.0";
window.__ANALYZE_BUILD__ = "2026-01-02T07:30";

/* signal loaded */
window.__ANALYZE_LOADED__ = true;
if (typeof log === "function") {
  log(`Analyze.js loaded (${window.__ANALYZE_ROM_ID__} ${window.__ANALYZE_VERSION__})`);
  log(`BUILD ${window.__ANALYZE_BUILD__}`);
}

/* ===== GLOBAL STATE ===== */
window.ROM_RESULTS = [];
window.ROM_REPEAT_COUNT = 10;
window.ROM_REPEAT_INTERVAL_MS = 300;

/* ===== VECTOR UTILITIES ===== */
function vec(a, b) {
  return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
}

function dot(u, v) {
  return u.x * v.x + u.y * v.y + u.z * v.z;
}

function cross(u, v) {
  return {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x
  };
}

function norm(u) {
  return Math.sqrt(dot(u, u));
}

function angle3D(u, v) {
  const c = dot(u, v) / (norm(u) * norm(v));
  return Math.acos(Math.min(1, Math.max(-1, c))) * 180 / Math.PI;
}

/* ===== PALM PLANE ===== */
function palmNormal(lm) {
  const a = vec(lm[0], lm[5]);   // wrist → index MCP
  const b = vec(lm[0], lm[17]);  // wrist → pinky MCP
  return cross(a, b);
}

/* ===== SIGNED JOINT ANGLE ===== */
function signedJointAngle(p0, p1, p2, palmN) {
  const u = vec(p1, p0);
  const v = vec(p1, p2);
  const ang = angle3D(u, v);
  const s = dot(cross(u, v), palmN);
  return s >= 0 ? ang : -ang;
}

/* ===== FINGERTIP–PALM DISTANCE (NORMALIZED) ===== */
function fingertipPalmDistance(lm, tipIndex) {
  const palmCenter = {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
    z: (lm[0].z + lm[5].z + lm[9].z + lm[13].z + lm[17].z) / 5
  };
  const d = norm(vec(palmCenter, lm[tipIndex]));
  const ref = norm(vec(lm[0], lm[9])); // wrist–middle MCP
  return d / ref;
}

/* ===== JOA (JOINT ORIENTED AGGREGATE) ===== */
function JOA(jointAngles) {
  return jointAngles.reduce((s, a) => s + Math.abs(a), 0);
}

/* ===== SINGLE ANALYZE ===== */
function analyzeOnce() {
  if (!window.lastLandmarks) {
    if (typeof log === "function") log("No landmarks");
    return null;
  }

  const lm = window.lastLandmarks;
  const pn = palmNormal(lm);

  const ring = {
    MCP: signedJointAngle(lm[13], lm[14], lm[15], pn),
    PIP: signedJointAngle(lm[14], lm[15], lm[16], pn),
    DIP: signedJointAngle(lm[15], lm[16], lm[16], pn),
    tipDist: fingertipPalmDistance(lm, 16)
  };

  const pinky = {
    MCP: signedJointAngle(lm[17], lm[18], lm[19], pn),
    PIP: signedJointAngle(lm[18], lm[19], lm[20], pn),
    DIP: signedJointAngle(lm[19], lm[20], lm[20], pn),
    tipDist: fingertipPalmDistance(lm, 20)
  };

  return {
    timestamp: new Date().toISOString(),
    ROM: window.__ANALYZE_ROM_ID__,
    VERSION: window.__ANALYZE_VERSION__,
    ring,
    pinky,
    JOA_ring: JOA([ring.MCP, ring.PIP, ring.DIP]),
    JOA_pinky: JOA([pinky.MCP, pinky.PIP, pinky.DIP])
  };
}

/* ===== MAIN ANALYZE ===== */
function analyze() {
  if (typeof log === "function") {
    log("analyze() start");
    log(`ROM=${window.__ANALYZE_ROM_ID__} VER=${window.__ANALYZE_VERSION__}`);
  }

  const res = analyzeOnce();
  if (!res) return;

  window.ROM_RESULTS.push(res);

  if (typeof log === "function") {
    log("RESULT " + JSON.stringify(res));
  }
}

/* ===== AUTO REPEAT MODE ===== */
function analyzeRepeat(
  count = window.ROM_REPEAT_COUNT,
  interval = window.ROM_REPEAT_INTERVAL_MS
) {
  window.ROM_RESULTS = [];
  let i = 0;

  if (typeof log === "function") {
    log(`Repeat analyze start: ${count} times`);
  }

  const timer = setInterval(() => {
    analyze();
    i++;
    if (i >= count) {
      clearInterval(timer);
      if (typeof log === "function") {
        log("Repeat analyze finished");
        log("SUMMARY " + JSON.stringify(window.ROM_RESULTS));
      }
    }
  }, interval);
}
