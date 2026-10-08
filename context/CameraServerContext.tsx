import StaticServer from '@dr.pogodin/react-native-static-server';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const assetsToLoad = [
  { module: require('@/assets/models/pose_landmarker_lite.task'), name: 'pose.task' },
  { module: require('@/assets/models/hand_landmarker.task'), name: 'hand.task' },
  { module: require('@/assets/models/vision_bundle.js.bin'), name: 'vision_bundle.js' },
  { module: require('@/assets/models/vision_wasm_internal.js.bin'), name: 'vision_wasm_internal.js' },
  { module: require('@/assets/models/vision_wasm_internal.wasm'), name: 'vision_wasm_internal.wasm' },
];

type CameraServerContextType = {
  serverUrl: string;
};

const CameraServerContext = createContext<CameraServerContextType>({
  serverUrl: '',
});

export const CameraServerProvider = ({ children }: { children: React.ReactNode }) => {
  const [serverUrl, setServerUrl] = useState('');
  const serverRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const setupGlobalServer = async () => {
      try {
        const wwwPath = `${FileSystem.documentDirectory}www/`;
        const dirInfo = await FileSystem.getInfoAsync(wwwPath);

        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(wwwPath, { intermediates: true });
          for (const item of assetsToLoad) {
            const asset = Asset.fromModule(item.module);
            await asset.downloadAsync();
            if (asset.localUri) {
              await FileSystem.copyAsync({
                from: asset.localUri,
                to: wwwPath + item.name,
              });
            }
          }
        }

        const serverPath = wwwPath.replace(/^file:\/\//, '');
        const server = new StaticServer({ port: 0, fileDir: serverPath });
        const rawUrl = await server.start();
        const safeUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

        if (isMounted) {
          serverRef.current = server;
          setServerUrl(safeUrl);
        } else {
          server.stop();
        }
      } catch (error) {
        console.error("Error iniciando Camera Server global:", error);
      }
    };

    setupGlobalServer();

    return () => {
      isMounted = false;
      if (serverRef.current) {
        try { serverRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  return (
    <CameraServerContext.Provider value={{ serverUrl }}>
      {children}
    </CameraServerContext.Provider>
  );
};

export const useCameraServer = () => useContext(CameraServerContext);