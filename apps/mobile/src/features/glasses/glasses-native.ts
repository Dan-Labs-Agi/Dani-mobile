import { type NativeModule, requireOptionalNativeModule } from "expo";
import { isAndroid } from "@/shared/lib/platform";

export type GlassesLiveState = "off" | "connecting" | "ready";

/** What the native glasses service knows. Secrets are never in it: it only says that one is saved. */
export interface GlassesState {
  /** The phone has Android 12 or later, which the Bluetooth permissions need. */
  supported: boolean;
  /** The screen is bound to the service. */
  attached: boolean;
  /** Dani is meant to be running: connected, or looking for the glasses. */
  running: boolean;
  glassesConnected: boolean;
  /** Empty when there is no name. */
  glassesName: string;
  liveState: GlassesLiveState;
  speaking: boolean;
  permissionsGranted: boolean;
  ignoringBattery: boolean;
  model: string;
  voice: string;
  search: boolean;
  backendUrl: string;
  hasApiKey: boolean;
  hasBackendToken: boolean;
}

/** A null or missing secret keeps the saved one. An empty secret clears it. */
export interface GlassesSettingsInput {
  apiKey?: string;
  model: string;
  voice: string;
  search: boolean;
  backendUrl: string;
  backendToken?: string;
}

export interface CloudApps {
  /** Empty when the request worked. */
  error: string;
  apps: { toolkit: string; connected: boolean }[];
}

// A type literal, not an interface: the event map of `NativeModule` needs an index signature.
type GlassesEvents = {
  onState: (state: GlassesState) => void;
  onLog: (event: { line: string }) => void;
  onLevel: (event: { level: number }) => void;
};

declare class GlassesModule extends NativeModule<GlassesEvents> {
  isSupported(): boolean;
  attach(): Promise<void>;
  detach(): Promise<void>;
  getState(): Promise<GlassesState>;
  getLog(): Promise<string>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startLive(): Promise<void>;
  stopLive(): Promise<void>;
  saveSettings(settings: GlassesSettingsInput): Promise<void>;
  refreshCloudApps(): Promise<CloudApps>;
  /** Resolves with an error text, or an empty string when the browser opened. */
  connectCloudApp(toolkit: string): Promise<string>;
  openBatterySettings(): Promise<void>;
  beep(): Promise<void>;
  stopSound(): Promise<void>;
  setVolume(percent: number): Promise<void>;
  /** Resolves false while the voice of the phone is not ready. */
  speak(text: string): Promise<boolean>;
}

const native = isAndroid ? requireOptionalNativeModule<GlassesModule>("OpenBotGlasses") : null;

/** Only Android 12 and later builds that have the module. Expo Go and iOS have none. */
export const glassesSupported = native?.isSupported() === true;

export const glassesNative: GlassesModule | null = glassesSupported ? native : null;
