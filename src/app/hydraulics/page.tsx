import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { HydraulicsApp } from "@/components/modules/HydraulicsApp";

export const metadata: Metadata = {
  title: "Drilling Hydraulics",
  description: "Power-law pressure losses, bit hydraulics, ECD and nozzle optimization.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Engineer"
        title="Drilling Hydraulics"
        description="Model the circulating system from the standpipe to the flowline. Pressure losses use the API RP 13D power-law model with separate pipe and annular rheology, and the optimizer sizes nozzles for maximum hydraulic horsepower or jet impact force."
      />
      <HydraulicsApp />
    </PageContainer>
  );
}
