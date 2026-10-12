/**
 * A front-view figure for Form Check. The player moves five handles (two
 * wrists, two ankles and the hips) and the elbows and knees are solved to
 * follow. Coordinates are in a 400 x 520 box with y pointing down.
 */

export type Vec = { x: number; y: number };

export type HandleId = "hips" | "wristL" | "wristR" | "ankleL" | "ankleR";

export type Pose = Record<HandleId, Vec>;

export const BONES = {
  torso: 118,
  shoulderHalf: 44,
  hipHalf: 24,
  upperArm: 62,
  forearm: 58,
  thigh: 82,
  shin: 80,
  neck: 20,
  head: 22,
};

export const FLOOR = 470;

export type Skeleton = {
  head: Vec;
  neck: Vec;
  shoulderL: Vec;
  shoulderR: Vec;
  elbowL: Vec;
  elbowR: Vec;
  wristL: Vec;
  wristR: Vec;
  hips: Vec;
  hipL: Vec;
  hipR: Vec;
  kneeL: Vec;
  kneeR: Vec;
  ankleL: Vec;
  ankleR: Vec;
};

/** Two-bone inverse kinematics: where the middle joint goes, bending toward `bend` (+1 or -1). */
function solve(root: Vec, target: Vec, a: number, b: number, bend: number): { mid: Vec; end: Vec } {
  let dx = target.x - root.x;
  let dy = target.y - root.y;
  let d = Math.hypot(dx, dy);
  const max = a + b - 0.5;
  const min = Math.abs(a - b) + 0.5;
  if (d < 0.001) {
    dx = 0;
    dy = 1;
    d = 1;
  }
  const reach = Math.min(Math.max(d, min), max);
  const ux = dx / d;
  const uy = dy / d;
  const end = { x: root.x + ux * reach, y: root.y + uy * reach };
  const along = (a * a - b * b + reach * reach) / (2 * reach);
  const off = Math.sqrt(Math.max(a * a - along * along, 0)) * bend;
  return {
    mid: { x: root.x + ux * along - uy * off, y: root.y + uy * along + ux * off },
    end,
  };
}

export function skeleton(pose: Pose): Skeleton {
  const hips = pose.hips;
  const neck = { x: hips.x, y: hips.y - BONES.torso };
  const head = { x: neck.x, y: neck.y - BONES.neck - BONES.head };
  const shoulderL = { x: neck.x - BONES.shoulderHalf, y: neck.y + 8 };
  const shoulderR = { x: neck.x + BONES.shoulderHalf, y: neck.y + 8 };
  const hipL = { x: hips.x - BONES.hipHalf, y: hips.y };
  const hipR = { x: hips.x + BONES.hipHalf, y: hips.y };
  // Elbows bend outward and down, knees bend outward.
  const armL = solve(shoulderL, pose.wristL, BONES.upperArm, BONES.forearm, 1);
  const armR = solve(shoulderR, pose.wristR, BONES.upperArm, BONES.forearm, -1);
  const legL = solve(hipL, pose.ankleL, BONES.thigh, BONES.shin, 1);
  const legR = solve(hipR, pose.ankleR, BONES.thigh, BONES.shin, -1);
  return {
    head,
    neck,
    shoulderL,
    shoulderR,
    elbowL: armL.mid,
    elbowR: armR.mid,
    wristL: armL.end,
    wristR: armR.end,
    hips,
    hipL,
    hipR,
    kneeL: legL.mid,
    kneeR: legR.mid,
    ankleL: legL.end,
    ankleR: legR.end,
  };
}

const STAND_HIP_Y = FLOOR - BONES.thigh - BONES.shin + 6;

export const REST: Pose = {
  hips: { x: 200, y: STAND_HIP_Y },
  wristL: { x: 142, y: STAND_HIP_Y - 4 },
  wristR: { x: 258, y: STAND_HIP_Y - 4 },
  ankleL: { x: 178, y: FLOOR },
  ankleR: { x: 222, y: FLOOR },
};

export type Exercise = { id: string; name: string; cue: string; pose: Pose };

export const exercises: Exercise[] = [
  {
    id: "t",
    name: "Arm raise",
    cue: "Arms straight out to the sides, level with your shoulders.",
    pose: {
      hips: { x: 200, y: STAND_HIP_Y },
      wristL: { x: 38, y: STAND_HIP_Y - 110 },
      wristR: { x: 362, y: STAND_HIP_Y - 110 },
      ankleL: { x: 178, y: FLOOR },
      ankleR: { x: 222, y: FLOOR },
    },
  },
  {
    id: "jack",
    name: "Jumping jack",
    cue: "The top of the jump: hands high and wide, feet apart.",
    pose: {
      hips: { x: 200, y: STAND_HIP_Y + 10 },
      wristL: { x: 96, y: STAND_HIP_Y - 212 },
      wristR: { x: 304, y: STAND_HIP_Y - 212 },
      ankleL: { x: 112, y: FLOOR },
      ankleR: { x: 288, y: FLOOR },
    },
  },
  {
    id: "squat",
    name: "Squat",
    cue: "Hips down and back, feet planted, hands together in front of your chest.",
    pose: {
      hips: { x: 200, y: STAND_HIP_Y + 78 },
      wristL: { x: 186, y: STAND_HIP_Y - 8 },
      wristR: { x: 214, y: STAND_HIP_Y - 8 },
      ankleL: { x: 138, y: FLOOR },
      ankleR: { x: 262, y: FLOOR },
    },
  },
  {
    id: "lunge",
    name: "Side lunge",
    cue: "Shift onto one bent leg, keep the other straight, arms out for balance.",
    pose: {
      hips: { x: 158, y: STAND_HIP_Y + 54 },
      wristL: { x: 22, y: STAND_HIP_Y - 44 },
      wristR: { x: 288, y: STAND_HIP_Y - 96 },
      ankleL: { x: 104, y: FLOOR },
      ankleR: { x: 300, y: FLOOR },
    },
  },
];

type Segment = { name: string; from: keyof Skeleton; to: keyof Skeleton };

const segments: Segment[] = [
  { name: "Left upper arm", from: "shoulderL", to: "elbowL" },
  { name: "Left forearm", from: "elbowL", to: "wristL" },
  { name: "Right upper arm", from: "shoulderR", to: "elbowR" },
  { name: "Right forearm", from: "elbowR", to: "wristR" },
  { name: "Left thigh", from: "hipL", to: "kneeL" },
  { name: "Left shin", from: "kneeL", to: "ankleL" },
  { name: "Right thigh", from: "hipR", to: "kneeR" },
  { name: "Right shin", from: "kneeR", to: "ankleR" },
];

const angle = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x);

function angleDiff(a: number, b: number) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return (d * 180) / Math.PI;
}

export type Score = {
  /** 0 to 1. */
  accuracy: number;
  /** The body part furthest from the trainer, and how to fix it. */
  worst: string | null;
};

/**
 * How closely a pose matches the trainer's. Every limb segment is compared
 * by angle, the way a pose-estimation model compares joint angles between
 * two people of different sizes, and hip position counts as well.
 */
export function score(player: Pose, trainer: Pose): Score {
  const p = skeleton(player);
  const t = skeleton(trainer);
  let sum = 0;
  let worst: { name: string; err: number; hint: string } | null = null;

  for (const seg of segments) {
    const diff = angleDiff(angle(p[seg.from], p[seg.to]), angle(t[seg.from], t[seg.to]));
    const s = Math.max(0, 1 - diff / 55);
    sum += s;
    if (!worst || diff / 55 > worst.err) {
      const end = seg.to;
      const dy = t[end].y - p[end].y;
      const dx = t[end].x - p[end].x;
      const dir = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "higher" : "lower") : dx < 0 ? "further left" : "further right";
      worst = { name: seg.name, err: diff / 55, hint: `${seg.name}: move it ${dir}.` };
    }
  }

  const hipErr = Math.hypot(p.hips.x - t.hips.x, p.hips.y - t.hips.y) / 70;
  const hipScore = Math.max(0, 1 - hipErr);
  if (!worst || hipErr > worst.err) {
    const dy = t.hips.y - p.hips.y;
    const dx = t.hips.x - p.hips.x;
    const dir = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "up" : "down") : dx < 0 ? "left" : "right";
    worst = { name: "Hips", err: hipErr, hint: `Hips: shift them ${dir}.` };
  }

  const accuracy = (sum + hipScore * 2) / (segments.length + 2);
  return { accuracy, worst: worst && worst.err > 0.12 ? worst.hint : null };
}

/** Keep a handle somewhere sensible: on screen, and feet never below the floor. */
export function constrain(id: HandleId, v: Vec): Vec {
  const x = Math.min(Math.max(v.x, 14), 386);
  if (id === "ankleL" || id === "ankleR") return { x, y: Math.min(Math.max(v.y, FLOOR - 150), FLOOR) };
  if (id === "hips") return { x: Math.min(Math.max(x, 110), 290), y: Math.min(Math.max(v.y, STAND_HIP_Y - 6), FLOOR - 40) };
  return { x, y: Math.min(Math.max(v.y, 20), FLOOR - 6) };
}
