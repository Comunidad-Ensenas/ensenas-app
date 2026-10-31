import * as THREE from 'three';

/**
- Hand geometry captured from a signer, expressed in palm-length units relative
- to the wrist and the anatomical basis (finger direction, palm normal, thumb side).
- It is the same for every frame, so the avatar can be reshaped once per clip.
 */
export interface HandShape {
  mcps: [number, number, number][];
  segments: [number, number, number][];
}

const FINGER_CHAINS = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];
const MCP_IDS = [1, 5, 9, 13, 17];
const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];

const round = (n: number) => Number(n.toFixed(4));

const toVec = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, -p.z);

function buildBasis(wrist: THREE.Vector3, middleMcp: THREE.Vector3, indexMcp: THREE.Vector3, littleMcp: THREE.Vector3) {
  const u = middleMcp.clone().sub(wrist);
  const palmLength = u.length();
  const e1 = u.clone().normalize();
  const side = littleMcp.clone().sub(indexMcp);
  const e3 = side.clone().sub(e1.clone().multiplyScalar(side.dot(e1))).normalize();
  const e2 = e1.clone().cross(e3);
  return { palmLength, e1, e2, e3 };
}

export function captureHandShape(points: { x: number; y: number; z: number }[]): HandShape {
  const wrist = toVec(points[0]);
  const { palmLength, e1, e2, e3 } = buildBasis(wrist, toVec(points[9]), toVec(points[5]), toVec(points[17]));

  const mcps = MCP_IDS.map((idx) => {
    const offset = toVec(points[idx]).sub(wrist).divideScalar(palmLength);
    return [round(offset.dot(e1)), round(offset.dot(e2)), round(offset.dot(e3))] as [number, number, number];
  });

  const segments = FINGER_CHAINS.map((chain) => {
    const lengths = [];
    for (let i = 1; i < chain.length; i++) {
      lengths.push(round(toVec(points[chain[i]]).distanceTo(toVec(points[chain[i - 1]])) / palmLength));
    }
    return lengths as [number, number, number];
  });

  return { mcps, segments };
}

const FINGER_VRM_BONES: Record<string, string[]> = {
  Thumb: ['ThumbMetacarpal', 'ThumbProximal', 'ThumbDistal'],
  Index: ['IndexProximal', 'IndexIntermediate', 'IndexDistal'],
  Middle: ['MiddleProximal', 'MiddleIntermediate', 'MiddleDistal'],
  Ring: ['RingProximal', 'RingIntermediate', 'RingDistal'],
  Little: ['LittleProximal', 'LittleIntermediate', 'LittleDistal'],
};

interface FingerSetup {
  names: string[];
  bones: THREE.Object3D[];
  dirs: THREE.Vector3[];
}

const fingerSetups = new WeakMap<object, Record<'left' | 'right', FingerSetup[]>>();
const handRestQuatInv = new WeakMap<object, Record<'left' | 'right', THREE.Quaternion>>();

export function prepareFingerRotations(humanoid: any): void {
  if (!humanoid || fingerSetups.has(humanoid)) return;

  const root = humanoid.normalizedHumanBonesRoot;
  const rootQuat = new THREE.Quaternion();
  if (root) {
    root.updateWorldMatrix(true, false);
    root.getWorldQuaternion(rootQuat).invert();
  }

  const setups: Record<'left' | 'right', FingerSetup[]> = { left: [], right: [] };
  const restInv: Record<'left' | 'right', THREE.Quaternion> = {
    left: new THREE.Quaternion(),
    right: new THREE.Quaternion(),
  };

  (['left', 'right'] as const).forEach((side) => {
    const rawHand = humanoid.getRawBoneNode(`${side}Hand`) as THREE.Object3D | null;
    if (rawHand && root) {
      const handRig = new THREE.Quaternion();
      rawHand.getWorldQuaternion(handRig);
      handRig.premultiply(rootQuat).invert();
      restInv[side].copy(handRig);
    }

    FINGER_NAMES.forEach((finger) => {
      const names = FINGER_VRM_BONES[finger].map((name) => `${side}${name}`);
      const bones = names.map((name) => {
        try {
          return humanoid.getNormalizedBoneNode(name) as THREE.Object3D | null;
        } catch {
          return null;
        }
      });
      if (bones.some((bone) => !bone)) return;

      const dirs = bones.slice(0, 2).map((_, i) => (bones[i + 1] as THREE.Object3D).position.clone().normalize());

      const rawDistal = humanoid.getRawBoneNode(names[2]) as THREE.Object3D | null;
      const tip = rawDistal && rawDistal.children.length ? rawDistal.children[0] : null;
      if (rawDistal && tip) {
        const direction = tip
          .getWorldPosition(new THREE.Vector3())
          .sub(rawDistal.getWorldPosition(new THREE.Vector3()))
          .applyQuaternion(rootQuat)
          .normalize();
        dirs.push(direction);
      } else {
        dirs.push(new THREE.Vector3(1, 0, 0));
      }

      setups[side].push({ names, bones: bones as THREE.Object3D[], dirs });
    });
  });

  fingerSetups.set(humanoid, setups);
  handRestQuatInv.set(humanoid, restInv);
}

// Runs for every hand on every rendered frame, so it reuses module scratch objects
// instead of allocating ~100 objects per call for the Hermes GC to collect.
const scratch = {
  handWorld: new THREE.Quaternion(),
  absolute: new THREE.Quaternion(),
  world: new THREE.Quaternion(),
  inverse: new THREE.Quaternion(),
  solved: new THREE.Quaternion(),
  bakedDir: new THREE.Vector3(),
  localDir: new THREE.Vector3(),
  baseDir: new THREE.Vector3(),
  baked: [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()],
  targets: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
};

export function solveFingerRotations(
  humanoid: any,
  side: 'left' | 'right',
  hasTrack: (vrmBoneName: string) => boolean
): void {
  const setups = fingerSetups.get(humanoid);
  if (!humanoid || !setups) return;

  const hand = humanoid.getNormalizedBoneNode(`${side}Hand`) as THREE.Object3D | null;
  if (!hand) return;
  if (!hasTrack(`${side}Hand`)) return;

  hand.getWorldQuaternion(scratch.handWorld);
  scratch.baseDir.set(side === 'left' ? 1 : -1, 0, 0);

  for (const setup of setups[side]) {
    let tracked = true;
    for (const name of setup.names) {
      if (!hasTrack(name)) {
        tracked = false;
        break;
      }
    }
    if (!tracked) continue;

    // Baked rotations and the direction each bone should point at.
    scratch.absolute.copy(scratch.handWorld);
    for (let i = 0; i < setup.bones.length; i++) {
      const baked = scratch.baked[i].copy(setup.bones[i].quaternion);
      scratch.absolute.multiply(baked);
      scratch.targets[i].copy(scratch.baseDir).applyQuaternion(scratch.absolute);
    }

    scratch.world.copy(scratch.handWorld);
    for (let i = 0; i < setup.bones.length; i++) {
      const baked = scratch.baked[i];
      scratch.bakedDir.copy(setup.dirs[i]).applyQuaternion(baked);
      scratch.localDir
        .copy(scratch.targets[i])
        .applyQuaternion(scratch.inverse.copy(scratch.world).invert())
        .normalize();

      const solved = scratch.solved.copy(baked);
      // A bone flipped 180 degrees has no unique axis, so keep the baked rotation.
      if (scratch.bakedDir.dot(scratch.localDir) > -0.999) {
        solved.setFromUnitVectors(scratch.bakedDir, scratch.localDir).multiply(baked);
      }

      setup.bones[i].quaternion.copy(solved);
      scratch.world.multiply(solved);
    }
  }
}

const originals = new WeakMap<object, Map<THREE.Object3D, THREE.Vector3>>();

function remember(map: Map<THREE.Object3D, THREE.Vector3>, node: THREE.Object3D | null | undefined) {
  if (node && !map.has(node)) map.set(node, node.position.clone());
  return node;
}

function tipOf(node: THREE.Object3D | null | undefined): THREE.Object3D | null {
  if (!node || node.children.length === 0) return null;
  return node.children[0];
}

export function applyHandShape(humanoid: any, side: 'left' | 'right', shape: HandShape): void {
  if (!humanoid || !shape) return;

  let store = originals.get(humanoid);
  if (!store) {
    store = new Map();
    originals.set(humanoid, store);
  }

  const raw = (name: string): THREE.Object3D | null => {
    try {
      return humanoid.getRawBoneNode(`${side}${name}`) ?? null;
    } catch {
      return null;
    }
  };

  const fingers = FINGER_NAMES.map((name) => {
    const bones: THREE.Object3D[] = [];
    if (name === 'Thumb') {
      const metacarpal = remember(store, raw('ThumbMetacarpal'));
      const proximal = remember(store, raw('ThumbProximal'));
      const distal = remember(store, raw('ThumbDistal'));
      if (!metacarpal || !proximal || !distal) return null;
      bones.push(metacarpal, proximal, distal);
    } else {
      const proximal = remember(store, raw(`${name}Proximal`));
      const intermediate = remember(store, raw(`${name}Intermediate`));
      const distal = remember(store, raw(`${name}Distal`));
      if (!proximal || !intermediate || !distal) return null;
      bones.push(proximal, intermediate, distal);
    }
    const children = [remember(store, bones[1]), remember(store, bones[2]), remember(store, tipOf(bones[2]))];
    return { bones, children };
  });

  const index = fingers[1];
  const middle = fingers[2];
  const little = fingers[4];
  if (!index || !middle || !little) return;

  const restInv = handRestQuatInv.get(humanoid)?.[side] ?? new THREE.Quaternion();

  const normalizedPosition = (name: string): THREE.Vector3 | null => {
    try {
      const node = humanoid.getNormalizedBoneNode(`${side}${name}`) as THREE.Object3D | null;
      return node ? node.position : null;
    } catch {
      return null;
    }
  };

  const middleMcp = normalizedPosition('MiddleProximal');
  const indexMcp = normalizedPosition('IndexProximal');
  const littleMcp = normalizedPosition('LittleProximal');
  if (!middleMcp || !indexMcp || !littleMcp) return;

  for (const finger of fingers) {
    if (!finger) continue;
    finger.bones.forEach((bone) => bone.position.copy(store!.get(bone)!));
    finger.children.forEach((child) => {
      if (child) child.position.copy(store!.get(child)!);
    });
  }

  const { palmLength, e1, e2, e3 } = buildBasis(new THREE.Vector3(), middleMcp, indexMcp, littleMcp);

  fingers.forEach((finger, i) => {
    if (!finger) return;
    const [a, b, c] = shape.mcps[i];
    const worldOffset = e1
      .clone()
      .multiplyScalar(a * palmLength)
      .addScaledVector(e2, b * palmLength)
      .addScaledVector(e3, c * palmLength);
    finger.bones[0].position.copy(worldOffset.applyQuaternion(restInv));

    finger.children.forEach((child, k) => {
      if (!child) return;
      child.position.setLength(shape.segments[i][k] * palmLength);
    });
  });
}

export function resetHandShape(humanoid: any): void {
  const store = originals.get(humanoid);
  if (!store) return;
  store.forEach((position, node) => node.position.copy(position));
}

export function medianHandShape(samples: HandShape[]): HandShape {
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  return {
    mcps: [0, 1, 2, 3, 4].map((i) => [0, 1, 2].map((j) => round(median(samples.map((s) => s.mcps[i][j])))) as [number, number, number]),
    segments: [0, 1, 2, 3, 4].map((i) => [0, 1, 2].map((j) => round(median(samples.map((s) => s.segments[i][j])))) as [number, number, number]),
  };
}