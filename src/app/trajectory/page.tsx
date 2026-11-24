import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { TrajectoryApp } from "@/components/modules/TrajectoryApp";

export const metadata: Metadata = {
  title: "Well Trajectory",
  description: "Plan J, S and horizontal wells, compute surveys by minimum curvature and view them in 3D.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Engineer"
        title="Well Trajectory"
        description="Design a build-and-hold, S-shaped or horizontal well, then compare it against MWD surveys calculated with the minimum-curvature method. Drag the 3D view to orbit the wellbore."
      />
      <TrajectoryApp />
    </PageContainer>
  );
}
