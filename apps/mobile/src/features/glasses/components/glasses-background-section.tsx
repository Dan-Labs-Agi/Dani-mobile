import { Typography } from "heroui-native";
import Check from "lucide-react-native/icons/check";
import { useCSSVariable } from "uniwind";
import { SettingsRow, SettingsSection } from "@/features/settings/components/settings-content";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";
import { glassesNative } from "../glasses-native";
import type { GlassesController } from "../model/use-glasses";

/** Android can stop the link in the background. The row opens its list of apps that battery savings skip. */
export function GlassesBackgroundSection({ glasses }: { glasses: GlassesController }) {
  const { t } = useText();
  const accent = String(useCSSVariable("--openbot-accent"));
  const allowed = glasses.state?.ignoringBattery === true;
  return (
    <SettingsSection
      title={t("mobile.settings.glasses.background.title")}
      footer={t("mobile.settings.glasses.background.footer")}
    >
      <SettingsRow
        trailing={allowed ? <Check size={18} color={accent} strokeWidth={2} /> : null}
        onPress={() => {
          void haptics.selection();
          void glassesNative?.openBatterySettings();
        }}
      >
        <Typography.Paragraph>
          {allowed ? t("mobile.settings.glasses.background.allowed") : t("mobile.settings.glasses.background.keep")}
        </Typography.Paragraph>
      </SettingsRow>
    </SettingsSection>
  );
}
