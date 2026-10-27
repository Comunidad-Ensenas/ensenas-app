import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Directory, File, Paths } from 'expo-file-system';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, StyleSheet, View } from 'react-native';

import AvatarModel from './AvatarModel';

const MIN_CAMERA_DISTANCE = 3.5;
const MAX_CAMERA_DISTANCE = 7;
const ORBIT_SENSITIVITY = 0.008;
const PITCH_LIMIT = Math.PI / 2 - 0.15;

type OrbitState = {
  yaw: number;
  pitch: number;
  distance: number;
};

type GestureMode = 'none' | 'orbit' | 'pinch';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createOrbitState(
  cameraPosition: [number, number, number],
  target: [number, number, number]
): OrbitState {
  const dx = cameraPosition[0] - target[0];
  const dy = cameraPosition[1] - target[1];
  const dz = cameraPosition[2] - target[2];
  const distance = clamp(
    Math.hypot(dx, dy, dz) || MAX_CAMERA_DISTANCE,
    MIN_CAMERA_DISTANCE,
    MAX_CAMERA_DISTANCE
  );

  return {
    yaw: Math.atan2(dx, dz),
    pitch: clamp(Math.asin(clamp(dy / distance, -1, 1)), -PITCH_LIMIT, PITCH_LIMIT),
    distance,
  };
}

function getTouchDistance(touches: readonly { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

function OrbitCamera({
  orbitRef,
  target,
}: {
  orbitRef: React.MutableRefObject<OrbitState>;
  target: [number, number, number];
}) {
  const { camera } = useThree();

  useFrame(() => {
    const { yaw, pitch, distance } = orbitRef.current;
    const cosPitch = Math.cos(pitch);

    camera.position.set(
      target[0] + distance * cosPitch * Math.sin(yaw),
      target[1] + distance * Math.sin(pitch),
      target[2] + distance * cosPitch * Math.cos(yaw)
    );
    camera.lookAt(target[0], target[1], target[2]);
  });

  return null;
}

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
  cameraPosition?: [number, number, number];
  orbitTarget?: [number, number, number];
  isConfigPreview?: boolean;
  onInteractionChange?: (active: boolean) => void;
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
  cameraPosition = [0, 0, 5],
  orbitTarget = [0, 0, 0],
  isConfigPreview = false,
  onInteractionChange,
}: SignPlayerProps) {
  const [animData, setAnimData] = useState<AnimationData | null>(externalAnimData);
  const [loadingAnimation, setLoadingAnimation] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  const orbitRef = useRef(createOrbitState(cameraPosition, orbitTarget));
  const gestureRef = useRef({
    mode: 'none' as GestureMode,
    lastX: 0,
    lastY: 0,
    pinchStartDistance: 0,
    pinchStartRadius: 0,
  });
  const interactionCallbackRef = useRef(onInteractionChange);

  useEffect(() => {
    interactionCallbackRef.current = onInteractionChange;
  }, [onInteractionChange]);

  useEffect(() => {
    return () => {
      interactionCallbackRef.current?.(false);
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          const gesture = gestureRef.current;
          const orbit = orbitRef.current;

          if (touches.length >= 2) {
            gesture.mode = 'pinch';
            gesture.pinchStartDistance = getTouchDistance(touches);
            gesture.pinchStartRadius = orbit.distance;
          } else if (touches.length === 1) {
            gesture.mode = 'orbit';
            gesture.lastX = touches[0].pageX;
            gesture.lastY = touches[0].pageY;
          }

          interactionCallbackRef.current?.(true);
        },
        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;
          const gesture = gestureRef.current;
          const orbit = orbitRef.current;

          if (touches.length >= 2) {
            const pinchDistance = getTouchDistance(touches);

            if (gesture.mode !== 'pinch') {
              gesture.mode = 'pinch';
              gesture.pinchStartDistance = pinchDistance;
              gesture.pinchStartRadius = orbit.distance;
              return;
            }

            if (pinchDistance > 0 && gesture.pinchStartDistance > 0) {
              orbit.distance = clamp(
                gesture.pinchStartRadius * (gesture.pinchStartDistance / pinchDistance),
                MIN_CAMERA_DISTANCE,
                MAX_CAMERA_DISTANCE
              );
            }
            return;
          }

          if (touches.length === 1) {
            const touch = touches[0];

            if (gesture.mode !== 'orbit') {
              gesture.mode = 'orbit';
              gesture.lastX = touch.pageX;
              gesture.lastY = touch.pageY;
              return;
            }

            const dx = touch.pageX - gesture.lastX;
            const dy = touch.pageY - gesture.lastY;

            orbit.yaw -= dx * ORBIT_SENSITIVITY;
            orbit.pitch = clamp(orbit.pitch - dy * ORBIT_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT);
            gesture.lastX = touch.pageX;
            gesture.lastY = touch.pageY;
          }
        },
        onPanResponderRelease: () => {
          gestureRef.current.mode = 'none';
          interactionCallbackRef.current?.(false);
        },
        onPanResponderTerminate: () => {
          gestureRef.current.mode = 'none';
          interactionCallbackRef.current?.(false);
        },
        onPanResponderReject: () => {
          gestureRef.current.mode = 'none';
          interactionCallbackRef.current?.(false);
        },
      }),
    []
  );

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
          <ActivityIndicator size="small" color="#00BFFF" />
        </View>
      )}

      {canvasReady && (
        <>
          <Canvas
            pointerEvents="none"
            camera={{
              position: cameraPosition,
              fov: 40,
              near: 0.01,
              far: 100,
            }}
            gl={{
              antialias: true,
              alpha: true,
            }}
          >
            <OrbitCamera orbitRef={orbitRef} target={orbitTarget} />
            <AvatarModel
              animData={animData}
              position={[0, -2.5, 0]}
              scale={2}
              isConfigPreview={isConfigPreview}
            />
          </Canvas>
          <View style={styles.gestureLayer} {...panResponder.panHandlers} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
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