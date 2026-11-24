import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { WellControlApp } from "@/components/modules/WellControlApp";

export const metadata: Metadata = {
  title: "Well Control & Kill Sheet",
  description: "Wait & Weight and Driller's method kill sheets with a gas-expansion kill simulation.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Simulate"
        title="Well Control & Kill Sheet"
        description="Enter shut-in data to build an IWCF/IADC-style kill sheet, then compare how the Wait & Weight and Driller's methods load the casing and shoe as a gas influx expands on its way to the choke."
      />
      <WellControlApp />
    </PageContainer>
  );
}
