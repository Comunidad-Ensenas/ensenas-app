import * as THREE from 'three';

/**
 * Hand geometry captured from a signer, expressed in palm-length units relative
 * to the wrist and the anatomical basis (finger direction, palm normal, thumb side).
 * It is the same for every frame, so the avatar can be reshaped once per clip.
 */
export interface HandShape {
  /** MCP offsets for thumb, index, middle, ring and little, as [e1, e2, e3]. */
  mcps: [number, number, number][];
  /** Segment lengths for thumb, index, middle, ring and little: [1->2, 2->3, 3->4]. */
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

/** The baker encodes depth as +z toward the viewer, so the raw z is negated. */
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
  /** Direction of each bone's child at rest, in the normalized bone's local frame. */
  dirs: THREE.Vector3[];
}

const fingerSetups = new WeakMap<object, Record<'left' | 'right', FingerSetup[]>>();
const handRestQuatInv = new WeakMap<object, Record<'left' | 'right', THREE.Quaternion>>();
const handCorrections = new WeakMap<object, Record<'left' | 'right', THREE.Quaternion>>();

/**
 * Cache the avatar's rest finger directions before the rig is posed. The baker
 * emits rotations assuming every phalanx rests along the arm axis, which is not
 * true for the thumb (and for avatars with a non T-pose hand), so the player
 * needs the real directions to place the baked directions back on the avatar.
 */
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
  const corrections: Record<'left' | 'right', THREE.Quaternion> = {
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

    const nodePosition = (name: string): THREE.Vector3 | null => {
      const node = humanoid.getNormalizedBoneNode(`${side}${name}`) as THREE.Object3D | null;
      return node ? node.position : null;
    };
    const middleMcp = nodePosition('MiddleProximal');
    const indexMcp = nodePosition('IndexProximal');
    const littleMcp = nodePosition('LittleProximal');
    if (middleMcp && indexMcp && littleMcp) {
      // The baker assumes a canonical hand (left along +X, right along -X, palm
      // normal -Y). Rotate the avatar's rest anatomical frame onto that frame so
      // its hand and baked palm offsets land on the source's side.
      const { e1, e2, e3 } = buildBasis(new THREE.Vector3(), middleMcp, indexMcp, littleMcp);
      const baseDir = new THREE.Vector3(side === 'left' ? 1 : -1, 0, 0);
      const baseNorm = new THREE.Vector3(0, -1, 0);
      const avatarFrame = new THREE.Matrix4().makeBasis(e1, e2, e3);
      const canonicalFrame = new THREE.Matrix4().makeBasis(baseDir, new THREE.Vector3(0, 1, 0), baseDir.clone().cross(baseNorm));
      corrections[side].setFromRotationMatrix(canonicalFrame.multiply(avatarFrame.invert()));
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
  handCorrections.set(humanoid, corrections);
}

/**
 * Re-solve a hand's finger rotations so each baked joint direction lands on the
 * avatar's real phalanx. Call after the mixer wrote the clip and before
 * `vrm.update`, once per frame.
 */
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

  const bakedHandWorld = hand.getWorldQuaternion(new THREE.Quaternion());
  const baseDir = new THREE.Vector3(side === 'left' ? 1 : -1, 0, 0);

  const fingers = setups[side].flatMap((setup) => {
    if (!setup.names.every((name) => hasTrack(name))) return [];

    const baked = setup.bones.map((bone) => bone.quaternion.clone());
    const absolute = bakedHandWorld.clone();
    const targets = baked.map((quat) => {
      absolute.multiply(quat);
      return baseDir.clone().applyQuaternion(absolute);
    });
    return [{ setup, baked, targets }];
  });

  if (fingers.length === 0) return;

  const correction = handCorrections.get(humanoid)?.[side];
  const handWorld = bakedHandWorld.clone();
  if (correction) {
    hand.quaternion.multiply(correction);
    handWorld.multiply(correction);
  }

  for (const { setup, baked, targets } of fingers) {
    let world = handWorld.clone();
    setup.bones.forEach((bone, i) => {
      const bakedDir = setup.dirs[i].clone().applyQuaternion(baked[i]);
      const localDir = targets[i].clone().applyQuaternion(world.clone().invert()).normalize();
      const solved = new THREE.Quaternion().setFromUnitVectors(bakedDir, localDir).multiply(baked[i]);
      bone.quaternion.copy(solved);
      world.multiply(solved);
    });
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

/**
 * Reshape a VRM hand so its palm and finger proportions match the signer's.
 * The baked rotations then place the joints where the signer's joints were,
 * which keeps touching fingers touching on every frame.
 */
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
    // Restore the signer-independent geometry before touching anything.
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
