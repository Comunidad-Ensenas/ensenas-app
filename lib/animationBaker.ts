import { captureHandShape, medianHandShape, type HandShape } from '@/lib/handRetarget';
import * as THREE from 'three';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FrameData {
  timestamp: number;
  pose3D?: Landmark[] | null;
  pose2D?: Landmark[] | null;
  leftHand?: Landmark[] | null;
  rightHand?: Landmark[] | null;
}

export interface AnimationTrack {
  name: string;
  times: number[];
  values: number[];
}

export interface AnimationData {
  duration: number;
  tracks: AnimationTrack[];
  handShape?: {
    left?: HandShape;
    right?: HandShape;
  };
}

interface BoneRotations {
  [boneName: string]: {
    times: number[];
    values: number[];
  };
}

const bases = {
  leftDir: new THREE.Vector3(1, 0, 0),
  leftNorm: new THREE.Vector3(0, -1, 0),
  rightDir: new THREE.Vector3(-1, 0, 0),
  rightNorm: new THREE.Vector3(0, -1, 0),
};

function getVector(p1: Landmark, p2: Landmark): THREE.Vector3 {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = -(p2.z - p1.z);
  const lenSq = dx * dx + dy * dy + dz * dz;
  if (lenSq < 1e-6) return new THREE.Vector3(0, 1, 0); 
  return new THREE.Vector3(dx, dy, dz).normalize();
}

function mirrorPoint(pt: Landmark | null | undefined): Landmark | null | undefined {
  return pt ? { ...pt, x: -pt.x } : pt;
}

function mirrorArray(arr: Landmark[] | null | undefined): Landmark[] | null | undefined {
  return arr ? arr.map(mirrorPoint as any) : arr;
}

function computeJointRotation(
  dir: THREE.Vector3,
  normal: THREE.Vector3,
  baseDir: THREE.Vector3,
  baseNormal: THREE.Vector3
): THREE.Quaternion {
  const q1 = new THREE.Quaternion().setFromUnitVectors(baseDir, dir);
  const expectedNormal = baseNormal.clone().applyQuaternion(q1);

  const nProj = normal.clone().projectOnPlane(dir).normalize();
  const eProj = expectedNormal.clone().projectOnPlane(dir).normalize();

  const q2 = new THREE.Quaternion();
  if (nProj.lengthSq() > 0.0001 && eProj.lengthSq() > 0.0001) {
    q2.setFromUnitVectors(eProj, nProj);
  }
  return q2.multiply(q1);
}

// Each sampler is queried with ascending times, so the cursor only moves forward.
// Restarting the scan from 0 for every sample was O(n^2) per bone and froze the
// JS thread when the recording stopped.
function makeQuatSampler(times: number[], values: number[]) {
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion();
  const out = new THREE.Quaternion();
  const last = times.length - 1;
  let cursor = 0;

  return (t: number): THREE.Quaternion => {
    if (t <= times[0]) return out.set(values[0], values[1], values[2], values[3]);
    if (t >= times[last]) {
      const idx = last * 4;
      return out.set(values[idx], values[idx + 1], values[idx + 2], values[idx + 3]);
    }

    while (cursor < last - 1 && times[cursor + 1] < t) cursor++;

    const anchor = cursor * 4;
    const next = anchor + 4;
    const ratio = (t - times[cursor]) / (times[cursor + 1] - times[cursor]);

    q0.set(values[anchor], values[anchor + 1], values[anchor + 2], values[anchor + 3]);
    q1.set(values[next], values[next + 1], values[next + 2], values[next + 3]);
    return out.copy(q0).slerp(q1, ratio);
  };
}

function smoothAndResampleTrack(
  boneRotations: BoneRotations,
  duration: number,
  targetFPS: number = 30
): BoneRotations {
  const smoothedRotations: BoneRotations = {};
  const totalFrames = Math.ceil(duration * targetFPS);
  const step = 1 / targetFPS;
  const window = 0.06;
  const smoothFactor = 0.65;

  for (const boneName in boneRotations) {
    const track = boneRotations[boneName];
    const oldTimes = track.times;
    const oldVals = track.values;

    const newTimes: number[] = [];
    const newVals: number[] = [];

    const getQuatAt = makeQuatSampler(oldTimes, oldVals);
    const getPrevQuatAt = makeQuatSampler(oldTimes, oldVals);
    const getNextQuatAt = makeQuatSampler(oldTimes, oldVals);

    for (let i = 0; i <= totalFrames; i++) {
      const t = i * step;
      newTimes.push(Number(t.toFixed(3)));

      const qMid = getQuatAt(t);
      const qPrev = getPrevQuatAt(t - window);
      const qNext = getNextQuatAt(t + window);

      const qAverage = qPrev.slerp(qNext, 0.5);
      qMid.slerp(qAverage, smoothFactor);

      newVals.push(
        Number(qMid.x.toFixed(4)),
        Number(qMid.y.toFixed(4)),
        Number(qMid.z.toFixed(4)),
        Number(qMid.w.toFixed(4))
      );
    }
    smoothedRotations[boneName] = { times: newTimes, values: newVals };
  }
  return smoothedRotations;
}

export function bakeAnimationLocal(
  frames: FrameData[],
  ignoreRecessive: boolean
): AnimationData {
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided for baking.');
  }

  const firstTime = frames[0].timestamp;
  const lastTime = frames[frames.length - 1].timestamp;
  const rawDuration = (lastTime - firstTime) / 1000;
  const duration = Math.max(3.0, rawDuration || 3.0);
  const fps = frames.length / duration;

  const boneRotations: BoneRotations = {};

  const saveRawQuat = (boneName: string, quat: THREE.Quaternion, time: number) => {
    if (!boneRotations[boneName]) boneRotations[boneName] = { times: [], values: [] };
    boneRotations[boneName].times.push(time);
    boneRotations[boneName].values.push(quat.x, quat.y, quat.z, quat.w);
  };

  const rightArmRest = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -1.25);
  const leftArmRest = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 1.25);
  const identityQuat = new THREE.Quaternion(0, 0, 0, 1);
  const handShapeSamples: { left: HandShape[]; right: HandShape[] } = { left: [], right: [] };

  frames.forEach((frame, i) => {
    const time = i / fps;

    saveRawQuat('spine', identityQuat, time);
    saveRawQuat('hips', identityQuat, time);

    let qAbsLeftLower = identityQuat.clone();
    let qAbsRightLower = identityQuat.clone();

    let hasLeftArm = false;
    let hasRightArm = false;

    if (frame.pose3D && frame.pose3D.length > 16) {
      const p = frame.pose3D;

      const physRightShoulder = p[12];
      const physRightElbow = p[14];
      const physRightWrist = p[16];

      const avLeftShoulder = mirrorPoint(physRightShoulder);
      const avLeftElbow = mirrorPoint(physRightElbow);
      const avLeftWrist = mirrorPoint(physRightWrist);

      if (avLeftShoulder && avLeftElbow && avLeftWrist && (avLeftShoulder.visibility ?? 0) > 0.4 && (avLeftElbow.visibility ?? 0) > 0.4) {
        const vUpper = getVector(avLeftShoulder, avLeftElbow);
        const vLower = getVector(avLeftElbow, avLeftWrist);

        let normal = new THREE.Vector3().crossVectors(vUpper, vLower);
        if (normal.lengthSq() < 0.01) {
          normal = bases.leftNorm.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(bases.leftDir, vUpper));
        } else {
          normal.normalize();
        }

        const qUpperWorld = computeJointRotation(vUpper, normal, bases.leftDir, bases.leftNorm);
        const qLowerWorld = computeJointRotation(vLower, normal, bases.leftDir, bases.leftNorm);

        const qLowerLocal = qUpperWorld.clone().invert().multiply(qLowerWorld);

        saveRawQuat('leftUpperArm', qUpperWorld, time);
        saveRawQuat('leftLowerArm', qLowerLocal, time);
        qAbsLeftLower = qLowerWorld;
        hasLeftArm = true;
      }

      const physLeftShoulder = p[11];
      const physLeftElbow = p[13];
      const physLeftWrist = p[15];

      const avRightShoulder = mirrorPoint(physLeftShoulder);
      const avRightElbow = mirrorPoint(physLeftElbow);
      const avRightWrist = mirrorPoint(physLeftWrist);

      if (avRightShoulder && avRightElbow && avRightWrist && (avRightShoulder.visibility ?? 0) > 0.4 && (avRightElbow.visibility ?? 0) > 0.4 && (!ignoreRecessive || frame.leftHand)) {
        const vUpper = getVector(avRightShoulder, avRightElbow);
        const vLower = getVector(avRightElbow, avRightWrist);

        let normal = new THREE.Vector3().crossVectors(vUpper, vLower);
        if (normal.lengthSq() < 0.01) {
          normal = bases.rightNorm.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(bases.rightDir, vUpper));
        } else {
          normal.normalize();
        }

        const qUpperWorld = computeJointRotation(vUpper, normal, bases.rightDir, bases.rightNorm);
        const qLowerWorld = computeJointRotation(vLower, normal, bases.rightDir, bases.rightNorm);

        const qLowerLocal = qUpperWorld.clone().invert().multiply(qLowerWorld);

        saveRawQuat('rightUpperArm', qUpperWorld, time);
        saveRawQuat('rightLowerArm', qLowerLocal, time);
        qAbsRightLower = qLowerWorld;
        hasRightArm = true;
      }
    }

    if (!hasLeftArm) {
      saveRawQuat('leftUpperArm', leftArmRest, time);
      saveRawQuat('leftLowerArm', identityQuat, time);
      qAbsLeftLower = leftArmRest.clone();
    }

    if (!hasRightArm) {
      saveRawQuat('rightUpperArm', rightArmRest, time);
      saveRawQuat('rightLowerArm', identityQuat, time);
      qAbsRightLower = rightArmRest.clone();
    }

    const processHand = (landmarks: Landmark[], prefix: 'left' | 'right', qAbsLower: THREE.Quaternion) => {
      const p0 = landmarks[0];
      const p5 = landmarks[5];
      const p9 = landmarks[9];
      const p17 = landmarks[17];

      const vDir = getVector(p0, p9);
      const vSide = getVector(p5, p17);

      const baseDir = bases[`${prefix}Dir`];
      const baseNorm = bases[`${prefix}Norm`];

      let palmNormal = new THREE.Vector3().crossVectors(vDir, vSide);
      if (palmNormal.lengthSq() < 0.01) {
        palmNormal = baseNorm.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(baseDir, vDir));
      } else {
        palmNormal.normalize();
      }

      if (prefix === 'left') {
        palmNormal.negate();
      }

      const qWristWorld = computeJointRotation(vDir, palmNormal, baseDir, baseNorm);
      const qWristLocal = qAbsLower.clone().invert().multiply(qWristWorld);
      saveRawQuat(`${prefix}Wrist`, qWristLocal, time);

      // Captura de las proporciones exactas de la mano limpia sin alteraciones
      handShapeSamples[prefix].push(captureHandShape(landmarks));

      const getCustomNormal = (dirIdx: number, sideIdx1: number, sideIdx2: number) => {
        const dDir = getVector(landmarks[0], landmarks[dirIdx]);
        const dSide = getVector(landmarks[sideIdx1], landmarks[sideIdx2]);
        let normal = new THREE.Vector3().crossVectors(dDir, dSide);
        if (normal.lengthSq() < 0.01) {
          normal = baseNorm.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(baseDir, dDir));
        } else {
          normal.normalize();
        }
        if (prefix === 'left') normal.negate();
        return normal;
      };

      const globalPalmNorm = getCustomNormal(9, 5, 17);
      
      const thumbSideVec = prefix === 'right' ? vSide.clone() : vSide.clone().negate();
      const thumbNormal = new THREE.Vector3().lerpVectors(globalPalmNorm, thumbSideVec, 0.6).normalize();

      const solve3DFinger = (name: string, idxs: number[], customNorm: THREE.Vector3) => {
        const vProx = getVector(landmarks[idxs[0]], landmarks[idxs[1]]);
        const qProxWorld = computeJointRotation(vProx, customNorm, baseDir, baseNorm);
        const qProxLocal = qWristWorld.clone().invert().multiply(qProxWorld);
        saveRawQuat(`${prefix}${name}Proximal`, qProxLocal, time);

        const vInter = getVector(landmarks[idxs[1]], landmarks[idxs[2]]);
        const qInterWorld = computeJointRotation(vInter, customNorm, baseDir, baseNorm);
        const qInterLocal = qProxWorld.clone().invert().multiply(qInterWorld);
        saveRawQuat(`${prefix}${name}Intermediate`, qInterLocal, time);

        const vDist = getVector(landmarks[idxs[2]], landmarks[idxs[3]]);
        const qDistWorld = computeJointRotation(vDist, customNorm, baseDir, baseNorm);
        const qDistLocal = qInterWorld.clone().invert().multiply(qDistWorld);
        saveRawQuat(`${prefix}${name}Distal`, qDistLocal, time);
      };

      solve3DFinger('Thumb', [1, 2, 3, 4], thumbNormal);
      solve3DFinger('Index', [5, 6, 7, 8], getCustomNormal(5, 5, 9));
      solve3DFinger('Middle', [9, 10, 11, 12], globalPalmNorm);
      solve3DFinger('Ring', [13, 14, 15, 16], getCustomNormal(13, 9, 17));
      solve3DFinger('Little', [17, 18, 19, 20], getCustomNormal(17, 13, 17));
    };

    const avLeftHand = mirrorArray(frame.rightHand);
    if (avLeftHand && avLeftHand.length === 21) {
      processHand(avLeftHand, 'left', qAbsLeftLower);
    }

    const avRightHand = mirrorArray(frame.leftHand);
    if (avRightHand && avRightHand.length === 21 && !ignoreRecessive) {
      processHand(avRightHand, 'right', qAbsRightLower);
    }
  });

  const smoothedBoneRotations = smoothAndResampleTrack(boneRotations, duration, 30);

  const tracks = Object.keys(smoothedBoneRotations).map((boneName) => ({
    name: `${boneName}.quaternion`,
    times: smoothedBoneRotations[boneName].times,
    values: smoothedBoneRotations[boneName].values,
  }));

  const handShape = {
    left: handShapeSamples.left.length ? medianHandShape(handShapeSamples.left) : undefined,
    right: handShapeSamples.right.length ? medianHandShape(handShapeSamples.right) : undefined,
  };

  return {
    duration: Number(duration.toFixed(3)),
    tracks,
    ...(handShape.left || handShape.right ? { handShape } : {}),
  };
}