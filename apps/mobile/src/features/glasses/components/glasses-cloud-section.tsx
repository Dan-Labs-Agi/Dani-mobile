import { Typography } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SettingsRow, SettingsSection } from "@/features/settings/components/settings-content";
import { SheetFormField } from "@/shared/components/sheet-form-field";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";
import { type CloudApps, glassesNative } from "../glasses-native";
import type { GlassesController } from "../model/use-glasses";

const FIELD_MAX_LENGTH = 512;

/** The DAN cloud: the backend address and device token, and the Gmail and Calendar sign-in. */
export function GlassesCloudSection({ glasses }: { glasses: GlassesController }) {
  const { t } = useText();
  const { state, save } = glasses;
  const [url, setUrl] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [apps, setApps] = useState<CloudApps | "checking" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const shownUrl = url ?? state?.backendUrl ?? "";
  const dirty = url !== null || token.trim() !== "";
  const configured = state?.hasBackendToken === true && (state.backendUrl ?? "").startsWith("https://");

  // `refresh` changes when the user saves or asks again, so the list is read again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `refresh` only starts another read.
  useEffect(() => {
    const native = glassesNative;
    if (!native || !configured) {
      setApps(null);
      return;
    }
    let current = true;
    setApps("checking");
    native
      .refreshCloudApps()
      .then((result) => current && setApps(result))
      .catch(() => current && setApps(null));
    return () => {
      current = false;
    };
  }, [configured, refresh]);

  const saveForm = async () => {
    await save({
      backendUrl: shownUrl,
      backendToken: token.trim() || undefined,
    });
    setUrl(null);
    setToken("");
    setNotice(null);
    setRefresh((value) => value + 1);
  };

  const connect = async (toolkit: string) => {
    const failure = await glassesNative?.connectCloudApp(toolkit);
    setNotice(failure ? failure : t("mobile.settings.glasses.cloud.signIn"));
  };

  const appsText =
    apps === "checking"
      ? t("mobile.settings.glasses.cloud.checking")
      : apps === null
        ? t("mobile.settings.glasses.cloud.noApps")
        : apps.error ||
          t("mobile.settings.glasses.cloud.apps", {
            apps: apps.apps.map((app) => `${app.toolkit} ${app.connected ? "✓" : "✗"}`).join("  "),
          });

  return (
    <SettingsSection
      title={t("mobile.settings.glasses.cloud.title")}
      footer={t("mobile.settings.glasses.cloud.footer")}
    >
      <View className="gap-3 py-3">
        <SheetFormField
          label={t("mobile.settings.glasses.cloud.url")}
          value={shownUrl}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={FIELD_MAX_LENGTH}
          onChangeText={setUrl}
        />
        <SheetFormField
          label={t("mobile.settings.glasses.cloud.token")}
          placeholder={
            state?.hasBackendToken
              ? t("mobile.settings.glasses.cloud.tokenSaved")
              : t("mobile.settings.glasses.cloud.tokenPlaceholder")
          }
          value={token}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          maxLength={FIELD_MAX_LENGTH}
          onChangeText={setToken}
        />
      </View>
      <SettingsRow
        disclosure={false}
        onPress={() => {
          void haptics.selection();
          if (dirty) void saveForm();
          else setRefresh((value) => value + 1);
        }}
      >
        <Typography.Paragraph>{t("mobile.settings.glasses.cloud.save")}</Typography.Paragraph>
      </SettingsRow>
      <SettingsRow disclosure={false} supportingText={notice ?? undefined}>
        <Typography.Paragraph type="body-xs" className="text-grouped-secondary">
          {appsText}
        </Typography.Paragraph>
      </SettingsRow>
      <SettingsRow disabled={!configured} onPress={() => void connect("gmail")}>
        <Typography.Paragraph>{t("mobile.settings.glasses.cloud.connectGmail")}</Typography.Paragraph>
      </SettingsRow>
      <SettingsRow disabled={!configured} onPress={() => void connect("googlecalendar")}>
        <Typography.Paragraph>{t("mobile.settings.glasses.cloud.connectCalendar")}</Typography.Paragraph>
      </SettingsRow>
    </SettingsSection>
  );
}
