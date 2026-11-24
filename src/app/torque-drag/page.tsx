import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { TorqueDragApp } from "@/components/modules/TorqueDragApp";

export const metadata: Metadata = {
  title: "Torque & Drag",
  description: "Soft-string torque and drag with broomstick plots and buckling checks.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Engineer"
        title="Torque & Drag"
        description="Predict hookloads and torque for tripping, rotating and drilling with a soft-string model. Use the broomstick plot to calibrate friction factors against field data and check weight transfer for slide drilling."
      />
      <TorqueDragApp />
    </PageContainer>
  );
}
