import { useFrame } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'react-native';

import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { AnimationData } from './SignPlayer';

import { applyHandShape, prepareFingerRotations, resetHandShape, solveFingerRotations } from '@/lib/handRetarget';

type AvatarModelProps = {
  animData?: AnimationData | null;
  position?: [number, number, number];
  scale?: number;
  isConfigPreview?: boolean;
};

const BONE_TO_VRM: Record<string, string> = {
  rightUpperArm: 'rightUpperArm',
  rightLowerArm: 'rightLowerArm',
  leftUpperArm: 'leftUpperArm',
  leftLowerArm: 'leftLowerArm',
  spine: 'spine',
  chest: 'chest',
  hips: 'hips',
  rightWrist: 'rightHand',
  leftWrist: 'leftHand',
  rightThumbProximal: 'rightThumbMetacarpal',
  rightThumbIntermediate: 'rightThumbProximal',
  rightThumbDistal: 'rightThumbDistal',
  rightIndexProximal: 'rightIndexProximal',
  rightIndexIntermediate: 'rightIndexIntermediate',
  rightIndexDistal: 'rightIndexDistal',
  rightMiddleProximal: 'rightMiddleProximal',
  rightMiddleIntermediate: 'rightMiddleIntermediate',
  rightMiddleDistal: 'rightMiddleDistal',
  rightRingProximal: 'rightRingProximal',
  rightRingIntermediate: 'rightRingIntermediate',
  rightRingDistal: 'rightRingDistal',
  rightLittleProximal: 'rightLittleProximal',
  rightLittleIntermediate: 'rightLittleIntermediate',
  rightLittleDistal: 'rightLittleDistal',
  leftThumbProximal: 'leftThumbMetacarpal',
  leftThumbIntermediate: 'leftThumbProximal',
  leftThumbDistal: 'leftThumbDistal',
  leftIndexProximal: 'leftIndexProximal',
  leftIndexIntermediate: 'leftIndexIntermediate',
  leftIndexDistal: 'leftIndexDistal',
  leftMiddleProximal: 'leftMiddleProximal',
  leftMiddleIntermediate: 'leftMiddleIntermediate',
  leftMiddleDistal: 'leftMiddleDistal',
  leftRingProximal: 'leftRingProximal',
  leftRingIntermediate: 'leftRingIntermediate',
  leftRingDistal: 'leftRingDistal',
  leftLittleProximal: 'leftLittleProximal',
  leftLittleIntermediate: 'leftLittleIntermediate',
  leftLittleDistal: 'leftLittleDistal',
};

async function loadNativeTexture(moduleId: number): Promise<THREE.Texture> {
  const asset = Asset.fromModule(moduleId);

  // Release builds resolve a bundled image to its Android drawable resource name and
  // expo-asset marks it as already downloaded, but expo-gl only decodes file:// paths
  // (see loadImage in expo-gl/common/EXGLImageUtils.cpp). Clearing the flag makes
  // downloadAsync copy the drawable to the cache and return a real file:// path.
  if (!asset.localUri?.startsWith('file://')) {
    asset.downloaded = false;
  }

  await asset.downloadAsync();
  const localUri = asset.localUri ?? asset.uri;

  if (!localUri) throw new Error('Asset de textura sin URI local');

  let width = asset.width ?? 0;
  let height = asset.height ?? 0;

  if (!width || !height) {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(localUri, (w, h) => resolve({ width: w, height: h }), reject);
    });
    width = dimensions.width;
    height = dimensions.height;
  }

  const texture = new THREE.Texture();
  (texture as unknown as { isDataTexture: boolean }).isDataTexture = true;
  texture.image = { data: asset, width, height } as any;

  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}

export default function AvatarModel({ animData, position = [0, 0, 0], scale = 1, isConfigPreview = false }: AvatarModelProps) {
  const [vrm, setVrm] = useState<any>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  const leftUpperArmRestQuat = useRef(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 1.2));
  const leftLowerArmFlexQuat = useRef(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -2.0));
  const leftHandFixQuat = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.5, 0, -1.0)));

  const trackedBones = useMemo(() => {
    const set = new Set<string>();
    for (const track of animData?.tracks ?? []) {
      const sourceBone = track.name.replace('.quaternion', '');
      set.add(BONE_TO_VRM[sourceBone] || sourceBone);
    }
    return set;
  }, [animData]);

  useEffect(() => {
    let cancelled = false;
    let loadedTexture: THREE.Texture | null = null;

    async function loadAvatar() {
      const vrmModelName = "egg";

      try {
        const vrmAsset = Asset.fromModule(require(`../../assets/3d/${vrmModelName}/avatar_debug.vrm`));
        await vrmAsset.downloadAsync();
        if (!vrmAsset.localUri) throw new Error('');

        const vrmFile = new File(vrmAsset.localUri);
        const arrayBuffer = await vrmFile.arrayBuffer();

        await new Promise((resolve) => setTimeout(resolve, 50));

        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        const gltf = await loader.parseAsync(arrayBuffer, '');
        if (cancelled) return;

        const loadedVrm = gltf.userData.vrm;
        if (!loadedVrm) throw new Error('');

        prepareFingerRotations(loadedVrm.humanoid);

        loadedVrm.scene.rotation.y = Math.PI;

        loadedTexture = await loadNativeTexture(require(`../../assets/3d/${vrmModelName}/avatar_texture.png`));
        if (cancelled) {
          loadedTexture.dispose();
          return;
        }
        textureRef.current = loadedTexture;

        loadedVrm.scene.traverse((object: THREE.Object3D) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;

          const oldMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

          const newMaterials = oldMaterials.map((oldMat: any) => {
            const matColor = oldMat.color ? oldMat.color.clone() : new THREE.Color(1, 1, 1);

            const material = new THREE.MeshBasicMaterial({
              map: loadedTexture!,
              color: matColor,
              side: THREE.DoubleSide,
            });

            if (oldMat.transparent) {
              material.transparent = true;
              material.opacity = oldMat.opacity !== undefined ? oldMat.opacity : 1;
            }

            material.alphaTest = oldMat.alphaTest > 0 ? oldMat.alphaTest : 0.5;
            material.depthWrite = true;

            return material;
          });

          mesh.material = newMaterials.length === 1 ? newMaterials[0] : newMaterials;
          mesh.frustumCulled = false;
        });

        const box = new THREE.Box3().setFromObject(loadedVrm.scene);
        const center = new THREE.Vector3();
        box.getCenter(center);

        loadedVrm.scene.position.y = -center.y;

        if (cancelled) return;
        setVrm(loadedVrm);
      } catch (error) {
        if (loadedTexture) loadedTexture.dispose();
        console.warn('No se pudo cargar el avatar 3D:', error);
      }
    }

    loadAvatar();

    return () => {
      cancelled = true;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!vrm || !animData) return;

    try {
      if (actionRef.current) {
        actionRef.current.stop();
        actionRef.current = null;
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }

      const tracks: THREE.KeyframeTrack[] = [];

      for (const sourceTrack of animData.tracks) {
        if (!sourceTrack.name.endsWith('.quaternion')) continue;

        const sourceBoneName = sourceTrack.name.replace('.quaternion', '');
        const vrmBoneName = BONE_TO_VRM[sourceBoneName] || sourceBoneName;

        let boneNode: any = null;
        try {
          boneNode = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName);
        } catch (e) {}
        if (!boneNode) {
          try {
            boneNode = vrm.humanoid?.getRawBoneNode(vrmBoneName);
          } catch (e) {}
        }

        if (!boneNode) continue;

        const track = new THREE.QuaternionKeyframeTrack(
          `${boneNode.name}.quaternion`,
          sourceTrack.times,
          sourceTrack.values
        );
        tracks.push(track);
      }

      if (tracks.length === 0) return;

      const clip = new THREE.AnimationClip('LSV_SIGN', animData.duration, tracks);
      const mixer = new THREE.AnimationMixer(vrm.scene);
      const action = mixer.clipAction(clip);

      action.reset();
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      action.play();

      mixerRef.current = mixer;
      actionRef.current = action;
    } catch (error) {}
  }, [vrm, animData]);

  useEffect(() => {
    if (!vrm || !vrm.humanoid) return;

    resetHandShape(vrm.humanoid);

    const shape = animData?.handShape;
    if (!shape) return;

    if (shape.left) applyHandShape(vrm.humanoid, 'left', shape.left);
    if (shape.right) applyHandShape(vrm.humanoid, 'right', shape.right);
  }, [vrm, animData]);

  useFrame((_, delta) => {
    if (!vrm) return;
    
    if (mixerRef.current) mixerRef.current.update(delta);

    if (isConfigPreview && vrm.humanoid) {
      const lUpper = vrm.humanoid.getNormalizedBoneNode('leftUpperArm') || vrm.humanoid.getRawBoneNode('leftUpperArm');
      const lLower = vrm.humanoid.getNormalizedBoneNode('leftLowerArm') || vrm.humanoid.getRawBoneNode('leftLowerArm');
      const lHand = vrm.humanoid.getNormalizedBoneNode('leftHand') || vrm.humanoid.getRawBoneNode('leftHand');
      
      if (lUpper) {
        lUpper.quaternion.copy(leftUpperArmRestQuat.current);
      }
      if (lLower) {
        lLower.quaternion.copy(leftLowerArmFlexQuat.current);
      }
      if (lHand) {
        lHand.quaternion.copy(leftHandFixQuat.current);
      }
    }

    if (vrm.humanoid) {
      const hasTrack = (name: string) => trackedBones.has(name);
      solveFingerRotations(vrm.humanoid, 'left', hasTrack);
      solveFingerRotations(vrm.humanoid, 'right', hasTrack);
    }

    vrm.update(delta);
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} position={position} scale={scale} />;
}