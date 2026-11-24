import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { RopApp } from "@/components/modules/RopApp";

export const metadata: Metadata = {
  title: "ROP Optimizer",
  description: "Bourgoyne-Young rate of penetration model with bit economics and cost per foot.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Calculate"
        title="ROP & Bit Economics Optimizer"
        description="Faster is not always cheaper. Combine the Bourgoyne-Young penetration model with cutter-wear and bearing-life estimates to find the weight on bit and rotary speed that minimise cost per foot."
      />
      <RopApp />
    </PageContainer>
  );
}
