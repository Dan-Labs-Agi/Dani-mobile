import { Button, Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useUniwind } from "uniwind";
import { SettingsRow, SettingsSection } from "@/features/settings/components/settings-content";
import { SettingsSwitch } from "@/features/settings/components/settings-controls";
import { SheetFormField } from "@/shared/components/sheet-form-field";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";
import { glassesNative } from "../glasses-native";
import type { GlassesController } from "../model/use-glasses";

const FIELD_MAX_LENGTH = 512;

/** The Gemini key, model and voice, and the button that starts a Gemini Live session. */
export function GlassesGeminiSection({ glasses }: { glasses: GlassesController }) {
  const { t } = useText();
  const { theme } = useUniwind();
  const { state, save, ensurePermissions } = glasses;
  const [key, setKey] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shownModel = model ?? state?.model ?? "";
  const shownVoice = voice ?? state?.voice ?? "";
  const dirty = key.trim() !== "" || model !== null || voice !== null;
  const hasKey = state?.hasApiKey === true || key.trim() !== "";
  const liveState = state?.liveState ?? "off";

  const saveForm = async () => {
    await save({
      apiKey: key.trim() || undefined,
      model: shownModel,
      voice: shownVoice,
    });
    setKey("");
    setModel(null);
    setVoice(null);
  };

  const run = (action: () => Promise<void>) => {
    setError(null);
    action().catch(() => {
      setError(t("mobile.settings.saveFailed"));
      void haptics.notification("error");
    });
  };

  const toggleLive = async () => {
    const native = glassesNative;
    if (!native) return;
    if (liveState !== "off") {
      await native.stopLive();
      return;
    }
    if (!hasKey) {
      setError(t("mobile.settings.glasses.gemini.needKey"));
      return;
    }
    // Without the glasses, Gemini uses the microphone of the phone.
    if (!(await ensurePermissions())) return;
    if (dirty) await saveForm();
    await native.startLive();
  };

  return (
    <SettingsSection
      title={t("mobile.settings.glasses.gemini.title")}
      footer={t("mobile.settings.glasses.gemini.footer")}
    >
      <View className="gap-3 py-3">
        <SheetFormField
          label={t("mobile.settings.glasses.gemini.key")}
          placeholder={
            state?.hasApiKey
              ? t("mobile.settings.glasses.gemini.keySaved")
              : t("mobile.settings.glasses.gemini.keyPlaceholder")
          }
          value={key}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          maxLength={FIELD_MAX_LENGTH}
          onChangeText={setKey}
        />
        <SheetFormField
          label={t("mobile.settings.glasses.gemini.model")}
          value={shownModel}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={FIELD_MAX_LENGTH}
          onChangeText={setModel}
        />
        <SheetFormField
          label={t("mobile.settings.glasses.gemini.voice")}
          value={shownVoice}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={FIELD_MAX_LENGTH}
          onChangeText={setVoice}
        />
      </View>
      <SettingsRow>
        <SettingsSwitch
          value={state?.search === true}
          disabled={!state}
          label={t("mobile.settings.glasses.gemini.search")}
          dark={theme === "dark"}
          onValueChange={(search) => run(() => save({ search }))}
        />
      </SettingsRow>
      <SettingsRow
        disabled={!dirty}
        disclosure={false}
        onPress={() => {
          void haptics.selection();
          run(saveForm);
        }}
      >
        <Typography.Paragraph>{t("mobile.settings.glasses.gemini.save")}</Typography.Paragraph>
      </SettingsRow>
      <View className="px-4 py-3">
        <Button
          variant={liveState === "off" ? "primary" : "secondary"}
          isDisabled={!state?.attached || liveState === "connecting"}
          onPress={() => {
            void haptics.selection();
            run(toggleLive);
          }}
        >
          <Button.Label>
            {liveState === "ready"
              ? t("mobile.settings.glasses.gemini.stop")
              : liveState === "connecting"
                ? t("mobile.settings.glasses.gemini.connecting")
                : t("mobile.settings.glasses.gemini.start")}
          </Button.Label>
        </Button>
        {error ? (
          <Typography.Paragraph accessibilityRole="alert" type="body-xs" className="pt-2 text-danger-text">
            {error}
          </Typography.Paragraph>
        ) : null}
      </View>
    </SettingsSection>
  );
}
