import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { SimulatorApp } from "@/components/sim/SimulatorApp";

export const metadata: Metadata = {
  title: "Live Rig Simulator",
  description: "Drill a well in real time through overpressure, losses and kicks.",
};

export default function Page() {
  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Simulate"
        title="Live Rig Simulator"
        description={
          <>
            Take the brake on an 8-1/2&quot; hole section. Penetration rate follows the Bourgoyne-Young model, pressures
            follow API power-law hydraulics, and the formations hide real pressure surprises. Press{" "}
            <kbd className="rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[12px]">Space</kbd> to start or pause.
          </>
        }
      />
      <SimulatorApp />
    </PageContainer>
  );
}
