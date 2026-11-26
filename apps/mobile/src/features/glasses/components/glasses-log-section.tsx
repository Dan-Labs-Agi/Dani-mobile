import { Typography } from "heroui-native";
import { View } from "react-native";
import { SettingsRow, SettingsSection } from "@/features/settings/components/settings-content";
import { copyWithHaptic } from "@/shared/lib/clipboard";
import { useText } from "@/shared/lib/text";

const LOG_TEXT_STYLE = { fontFamily: "monospace" } as const;

/** What the service and the link report, newest line first. It is the main help when the link fails. */
export function GlassesLogSection({ log }: { log: string[] }) {
  const { t } = useText();
  const text = log.join("\n");
  return (
    <SettingsSection title={t("mobile.settings.glasses.log.title")}>
      <View className="px-4 py-3">
        <Typography.Paragraph selectable type="body-xs" style={LOG_TEXT_STYLE}>
          {text || t("mobile.settings.glasses.log.empty")}
        </Typography.Paragraph>
      </View>
      <SettingsRow disabled={!text} disclosure={false} onPress={() => copyWithHaptic(text)}>
        <Typography.Paragraph>{t("mobile.settings.glasses.log.copy")}</Typography.Paragraph>
      </SettingsRow>
    </SettingsSection>
  );
}
