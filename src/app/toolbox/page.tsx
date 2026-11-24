import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { ToolboxApp } from "@/components/modules/ToolboxApp";

export const metadata: Metadata = {
  title: "Toolbox",
  description: "Oilfield unit converter and drilling formula reference.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Reference"
        title="Toolbox"
        description="Convert between oilfield and SI units, and look up the formulas behind every module."
      />
      <ToolboxApp />
    </PageContainer>
  );
}
