import { useFrame } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'react-native';

import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { AnimationData } from './SignPlayer';

type AvatarModelProps = {
  animData?: AnimationData | null;
  position?: [number, number, number];
  scale?: number;
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
  await asset.downloadAsync();
  const localUri = asset.localUri ?? asset.uri;

  if (!localUri) throw new Error('');

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

export default function AvatarModel({ animData, position = [0, 0, 0], scale = 1 }: AvatarModelProps) {
  const [vrm, setVrm] = useState<any>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedTexture: THREE.Texture | null = null;

    async function loadAvatar() {
      try {
        const vrmAsset = Asset.fromModule(require('../../assets/models/avatar_debug.vrm'));
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

        loadedVrm.scene.rotation.y = Math.PI;

        loadedTexture = await loadNativeTexture(require('../../assets/models/avatar_texture.png'));
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

  useFrame((_, delta) => {
    if (!vrm) return;
    if (mixerRef.current) mixerRef.current.update(delta);
    vrm.update(delta);
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} position={position} scale={scale} />;
}