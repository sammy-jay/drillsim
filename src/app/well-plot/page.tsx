import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { WellPlotterApp } from "@/components/modules/WellPlotterApp";

export const metadata: Metadata = {
  title: "Well Plotter",
  description: "Enter or paste MD, inclination, azimuth, TVD and vertical section to plot a well diagram.",
};

export default function Page() {
  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Engineer"
        title="Well Plotter"
        description="Turn your own survey data into a well diagram. Enter MD, inclination and azimuth (plus TVD, vertical section and coordinates if you have them), add casing, formation tops and targets, and get a vertical-section diagram, plan view, 3D view and QC against minimum curvature."
      />
      <WellPlotterApp />
    </PageContainer>
  );
}
