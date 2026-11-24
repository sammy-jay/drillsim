import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { ReportsApp } from "@/components/reports/ReportsApp";

export const metadata: Metadata = {
  title: "Daily Drilling Reports",
  description: "Learn to read and write daily drilling reports with annotated examples and a guided editor.",
};

export default function Page() {
  return (
    <PageContainer>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Operations"
          title="Daily Drilling Reports"
          description="The daily drilling report (DDR) is the official record of everything that happened on the rig in 24 hours. Study annotated examples from a training well, then write your own with a guided editor that checks your time log adds up to 24 hours."
        />
      </div>
      <ReportsApp />
    </PageContainer>
  );
}
