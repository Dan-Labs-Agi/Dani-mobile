import type { MobileTranslate } from "@openbot/i18n/mobile";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";
import { SettingsNote, SettingsSection } from "@/features/settings/components/settings-content";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";
import type { GlassesState } from "../glasses-native";
import type { GlassesController } from "../model/use-glasses";

function statusText(t: MobileTranslate, state: GlassesState | null): string {
  if (!state?.attached) return t("mobile.settings.glasses.status.starting");
  if (state.glassesConnected && state.liveState === "ready") {
    return state.speaking
      ? t("mobile.settings.glasses.status.speaking")
      : t("mobile.settings.glasses.status.listening");
  }
  if (state.liveState === "connecting") return t("mobile.settings.glasses.status.connectingGemini");
  if (state.glassesConnected) {
    return state.glassesName
      ? t("mobile.settings.glasses.status.connected", {
          name: state.glassesName,
        })
      : t("mobile.settings.glasses.status.connectedDefault");
  }
  return state.running ? t("mobile.settings.glasses.status.looking") : t("mobile.settings.glasses.status.notConnected");
}

function buttonText(t: MobileTranslate, state: GlassesState | null): string {
  if (state?.glassesConnected) return t("mobile.settings.glasses.disconnect");
  if (state?.running) return t("mobile.settings.glasses.stopLooking");
  return t("mobile.settings.glasses.connect");
}

/** The status of the link and the one button that starts or ends it. */
export function GlassesConnectionSection({ glasses }: { glasses: GlassesController }) {
  const { t } = useText();
  const { state, permissionsRefused, toggleConnect } = glasses;
  return (
    <SettingsSection>
      <View className="gap-3 px-4 py-3">
        <Typography.Paragraph>{statusText(t, state)}</Typography.Paragraph>
        <Button
          variant={state?.running ? "secondary" : "primary"}
          isDisabled={!state?.attached}
          onPress={() => {
            void haptics.selection();
            void toggleConnect();
          }}
        >
          <Button.Label>{buttonText(t, state)}</Button.Label>
        </Button>
      </View>
      {permissionsRefused ? <SettingsNote>{t("mobile.settings.glasses.permissions")}</SettingsNote> : null}
    </SettingsSection>
  );
}
