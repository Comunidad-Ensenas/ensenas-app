import { OrbitControls } from '@react-three/drei/native';
import { Canvas } from '@react-three/fiber/native';
import { Directory, File, Paths } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AvatarModel from './AvatarModel';

type AnimationTrack = {
  name: string;
  times: number[];
  values: number[];
};

export type AnimationData = {
  duration: number;
  tracks: AnimationTrack[];
};

type SignPlayerProps = {
  animationFile?: string | null;
  animData?: AnimationData | null;
  width?: number;
  height?: number;
};

function getAnimationFile(animationFile: string): File {
  if (
    animationFile.startsWith('file://') ||
    animationFile.startsWith('content://') ||
    animationFile.startsWith('/')
  ) {
    return new File(animationFile);
  }

  const ensenasDirectory = new Directory(Paths.document, 'ensenas');
  const animationsDirectory = new Directory(ensenasDirectory, 'animations');

  return new File(animationsDirectory, animationFile);
}

export default function SignPlayer({
  animationFile,
  animData: externalAnimData = null,
  width = 320,
  height = 320,
}: SignPlayerProps) {
  const [animData, setAnimData] = useState<AnimationData | null>(externalAnimData);
  const [loadingAnimation, setLoadingAnimation] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAnimation() {
      if (externalAnimData) {
        setAnimData(externalAnimData);
        return;
      }

      if (!animationFile) {
        setAnimData(null);
        return;
      }

      try {
        setLoadingAnimation(true);
        const file = getAnimationFile(animationFile);

        if (!file.exists) {
          throw new Error(`No existe el archivo de animación: ${file.uri}`);
        }

        const json = file.textSync();
        const parsed: AnimationData = JSON.parse(json);

        if (!parsed || !Array.isArray(parsed.tracks)) {
          throw new Error('El JSON de animación no tiene el formato esperado.');
        }

        if (cancelled) {
          return;
        }

        setAnimData(parsed);
      } catch (error) {
        if (!cancelled) {
          setAnimData(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingAnimation(false);
        }
      }
    }

    loadAnimation();

    return () => {
      cancelled = true;
    };
  }, [animationFile, externalAnimData]);

  useEffect(() => {
    setCanvasReady(false);

    const timer = setTimeout(() => {
      setCanvasReady(true);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [width, height, animationFile]);

  return (
    <View style={[styles.container, { width, height }]}>
      {loadingAnimation && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" />
        </View>
      )}

      {canvasReady && (
        <Canvas
          camera={{
            position: [0, 0, 5],
            fov: 40,
            near: 0.01,
            far: 100,
          }}
          gl={{
            antialias: true,
            alpha: true,
          }}
        >
          <OrbitControls enablePan={false} minDistance={1} maxDistance={6} />
          <AvatarModel animData={animData} position={[0, -2.5, 0]} scale={2} />
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    zIndex: 10,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});