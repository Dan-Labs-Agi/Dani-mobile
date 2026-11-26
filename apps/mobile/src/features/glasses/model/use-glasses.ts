import { useCallback, useEffect, useState } from "react";
import { type Permission, PermissionsAndroid } from "react-native";
import { type GlassesSettingsInput, type GlassesState, glassesNative } from "../glasses-native";

const LOG_LINES = 150;

const PERMISSIONS: Permission[] = [
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
];

export interface GlassesController {
  state: GlassesState | null;
  /** Newest line first. */
  log: string[];
  /** The loudness of the glasses microphone, 0 to 100. */
  level: number;
  /** True after the user refused the permissions that the last request asked for. */
  permissionsRefused: boolean;
  /** Asks for Nearby devices and Microphone when the app does not have them yet. */
  ensurePermissions: () => Promise<boolean>;
  /** Connects, or disconnects when Dani is already running. */
  toggleConnect: () => Promise<void>;
  /** Saves some settings and keeps the others as they are. */
  save: (patch: Partial<GlassesSettingsInput>) => Promise<void>;
}

/**
 * Binds the screen to the glasses service while it is open. The service keeps running without the
 * screen: it holds the Bluetooth link and the Gemini session.
 */
export function useGlasses(): GlassesController {
  const [state, setState] = useState<GlassesState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [level, setLevel] = useState(0);
  const [permissionsRefused, setPermissionsRefused] = useState(false);
  const attached = state?.attached === true;

  useEffect(() => {
    const native = glassesNative;
    if (!native) return;
    const subscriptions = [
      native.addListener("onState", setState),
      native.addListener("onLog", ({ line }) => setLog((lines) => [line, ...lines].slice(0, LOG_LINES))),
      native.addListener("onLevel", ({ level: next }) => setLevel(next)),
    ];
    void native.attach().then(() => native.getState().then(setState));
    return () => {
      for (const subscription of subscriptions) subscription.remove();
      void native.detach();
    };
  }, []);

  // The service keeps the log while no screen is open, so read it once the screen is bound.
  useEffect(() => {
    if (!attached || !glassesNative) return;
    void glassesNative.getLog().then((text) => setLog(text ? text.split("\n") : []));
  }, [attached]);

  const ensurePermissions = useCallback(async () => {
    const native = glassesNative;
    if (!native) return false;
    if ((await native.getState()).permissionsGranted) return true;
    // Notifications are not required: they only show the notice while Dani runs in the background.
    const result = await PermissionsAndroid.requestMultiple([
      ...PERMISSIONS,
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ]);
    const granted = PERMISSIONS.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
    setPermissionsRefused(!granted);
    setState(await native.getState());
    return granted;
  }, []);

  const toggleConnect = useCallback(async () => {
    const native = glassesNative;
    if (!native) return;
    if ((await native.getState()).running) {
      await native.disconnect();
      return;
    }
    if (await ensurePermissions()) await native.connect();
  }, [ensurePermissions]);

  const save = useCallback(async (patch: Partial<GlassesSettingsInput>) => {
    const native = glassesNative;
    if (!native) return;
    const current = await native.getState();
    await native.saveSettings({
      model: current.model,
      voice: current.voice,
      search: current.search,
      backendUrl: current.backendUrl,
      ...patch,
    });
  }, []);

  return {
    state,
    log,
    level,
    permissionsRefused,
    ensurePermissions,
    toggleConnect,
    save,
  };
}
