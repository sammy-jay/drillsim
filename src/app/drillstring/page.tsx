import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { DrillStringApp } from "@/components/modules/DrillStringApp";

export const metadata: Metadata = {
  title: "Drill String & BHA",
  description: "Buoyancy, BHA length for WOB, neutral point and margin of overpull.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Calculate"
        title="Drill String & BHA Design"
        description="Size the bottomhole assembly so the neutral point stays in the drill collars, check drill-pipe tensile capacity and margin of overpull, and see where the string is in tension or compression."
      />
      <DrillStringApp />
    </PageContainer>
  );
}
