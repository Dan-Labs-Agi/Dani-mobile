import { SettingsContent, SettingsNote } from "@/features/settings/components/settings-content";
import { useText } from "@/shared/lib/text";
import { GlassesBackgroundSection } from "../components/glasses-background-section";
import { GlassesCloudSection } from "../components/glasses-cloud-section";
import { GlassesConnectionSection } from "../components/glasses-connection-section";
import { GlassesGeminiSection } from "../components/glasses-gemini-section";
import { GlassesLogSection } from "../components/glasses-log-section";
import { GlassesTestSection } from "../components/glasses-test-section";
import { glassesSupported } from "../glasses-native";
import { useGlasses } from "../model/use-glasses";

/**
 * Connects the phone to the Dani glasses. The glasses are a Bluetooth microphone and speaker: the
 * `OpenBotGlasses` native module and its foreground service do the work, and this screen is the
 * remote that shows its state.
 */
export function GlassesScreen() {
  const { t } = useText();
  const glasses = useGlasses();
  if (!glassesSupported) {
    return (
      <SettingsContent>
        <SettingsNote>{t("mobile.settings.glasses.unsupported")}</SettingsNote>
      </SettingsContent>
    );
  }
  return (
    <SettingsContent>
      <GlassesConnectionSection glasses={glasses} />
      <GlassesGeminiSection glasses={glasses} />
      <GlassesCloudSection glasses={glasses} />
      <GlassesBackgroundSection glasses={glasses} />
      <GlassesTestSection glasses={glasses} />
      <GlassesLogSection log={glasses.log} />
    </SettingsContent>
  );
}
