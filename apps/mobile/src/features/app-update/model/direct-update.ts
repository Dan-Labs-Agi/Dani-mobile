import { isNewerMobileVersion } from "@openbot/contracts/mobile-features";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { currentAppVersion } from "@/shared/lib/mobile-features";
import { isAndroid } from "@/shared/lib/platform";

/** Where the Android build publishes itself. The file is replaced in place on every build. */
export const DIRECT_UPDATE_URL = "https://dl.dani.danlab.dev/android/latest.json";
export const DIRECT_APK_URL = "https://dl.dani.danlab.dev/android/dani-dex-new.apk";

const CHECK_TIMEOUT_MS = 10_000;
const CHECK_INTERVAL_MS = 5 * 60_000;

async function fetchDirectVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`${DIRECT_UPDATE_URL}?t=${Date.now()}`, { signal: controller.signal });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return null;
    const version = (body as { version?: unknown }).version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** The newest version of the directly installed Android app, or null when none is newer. */
export function useDirectLatestVersion(): string | null {
  const [latest, setLatest] = useState<string | null>(null);
  useEffect(() => {
    if (!isAndroid || __DEV__) return;
    let last = 0;
    const check = () => {
      if (Date.now() - last < CHECK_INTERVAL_MS) return;
      last = Date.now();
      void fetchDirectVersion().then((version) => {
        const current = currentAppVersion();
        setLatest(version && current && isNewerMobileVersion(version, current) ? version : null);
      });
    };
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => subscription.remove();
  }, []);
  return latest;
}
