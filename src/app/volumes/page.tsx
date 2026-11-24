import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { VolumesApp } from "@/components/modules/VolumesApp";

export const metadata: Metadata = {
  title: "Volumes & Capacities",
  description: "String, annular and pit volumes, pump output, bottoms-up and trip calculations.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Calculate"
        title="Volumes & Capacities"
        description="Everyday rig-floor numbers: pump output, string and annular volumes, strokes and lag times, annular velocities, trip-tank fill volumes and slug design."
      />
      <VolumesApp />
    </PageContainer>
  );
}
