"use client";
import { HubTabs } from "@/components/HubTabs";
import PreferencesSection from "@/components/sections/settings";
import AboutSection from "@/components/sections/about";

export function SettingsHub() {
  return (
    <HubTabs title="Settings" headline="Preferences."
      tabs={[
        { id: "preferences", label: "Preferences", component: PreferencesSection },
        { id: "about", label: "About", component: AboutSection },
      ]} />
  );
}
