import { Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useUniwind } from "uniwind";
import { SettingsRow, SettingsSection } from "@/features/settings/components/settings-content";
import { SettingsPicker } from "@/features/settings/components/settings-controls";
import { SheetFormField } from "@/shared/components/sheet-form-field";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";
import { glassesNative } from "../glasses-native";
import type { GlassesController } from "../model/use-glasses";

const VOLUMES = [25, 50, 75, 100];
const SAY_MAX_LENGTH = 500;

/** Checks of the link: the microphone level, a beep, speech through the speaker and the volume. */
export function GlassesTestSection({ glasses }: { glasses: GlassesController }) {
  const { t } = useText();
  const { theme } = useUniwind();
  const connected = glasses.state?.glassesConnected === true;
  const [text, setText] = useState(() => t("mobile.settings.glasses.tests.sayDefault"));
  const [volume, setVolume] = useState(75);
  const [notice, setNotice] = useState<string | null>(null);

  const say = async () => {
    const spoken = await glassesNative?.speak(text);
    setNotice(spoken === false ? t("mobile.settings.glasses.tests.voiceNotReady") : null);
  };

  return (
    <SettingsSection title={t("mobile.settings.glasses.tests.title")}>
      <View className="gap-2 px-4 py-3" accessible accessibilityLabel={t("mobile.settings.glasses.tests.micLevel")}>
        <Typography type="body-xs" className="text-grouped-secondary">
          {t("mobile.settings.glasses.tests.micLevel")}
        </Typography>
        <View className="h-2 overflow-hidden rounded-full bg-grouped-border">
          <View className="h-2 rounded-full bg-accent" style={{ width: `${connected ? glasses.level : 0}%` }} />
        </View>
      </View>
      <SettingsRow
        disabled={!connected}
        disclosure={false}
        onPress={() => {
          void haptics.selection();
          void glassesNative?.beep();
        }}
      >
        <Typography.Paragraph>{t("mobile.settings.glasses.tests.beep")}</Typography.Paragraph>
      </SettingsRow>
      <View className="py-3">
        <SheetFormField
          label={t("mobile.settings.glasses.tests.sayPlaceholder")}
          value={text}
          editable={connected}
          maxLength={SAY_MAX_LENGTH}
          onChangeText={setText}
        />
      </View>
      <SettingsRow
        disabled={!connected || text.trim() === ""}
        disclosure={false}
        supportingText={notice ?? undefined}
        onPress={() => {
          void haptics.selection();
          void say();
        }}
      >
        <Typography.Paragraph>{t("mobile.settings.glasses.tests.say")}</Typography.Paragraph>
      </SettingsRow>
      <SettingsRow
        disabled={!connected}
        disclosure={false}
        onPress={() => {
          void haptics.selection();
          void glassesNative?.stopSound();
        }}
      >
        <Typography.Paragraph>{t("mobile.settings.glasses.tests.stopSound")}</Typography.Paragraph>
      </SettingsRow>
      <SettingsRow
        disclosure={false}
        trailing={
          <SettingsPicker
            value={volume}
            options={VOLUMES.map((value) => ({ value, label: `${value}%` }))}
            enabled={connected}
            dark={theme === "dark"}
            label={t("mobile.settings.glasses.tests.volume")}
            onChange={(next) => {
              setVolume(next);
              void glassesNative?.setVolume(next);
            }}
          />
        }
      >
        <Typography.Paragraph>{t("mobile.settings.glasses.tests.volume")}</Typography.Paragraph>
      </SettingsRow>
    </SettingsSection>
  );
}
