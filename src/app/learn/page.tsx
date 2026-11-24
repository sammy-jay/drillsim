import type { Metadata } from "next";
import { LearningCenter } from "@/components/learning/LearningCenter";
import { PageContainer, PageHeader } from "@/components/ui/Panel";

export const metadata: Metadata = {
  title: "Learning Center",
  description: "Guided drilling engineering lessons, worked field examples, knowledge checks and simulator practice.",
};

export default function Page() {
  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Learn · DrillSim"
        title="Learn the why behind the numbers."
        description="Build your drilling engineering understanding one concept at a time. Study the model, connect it to field decisions, check your understanding, then practice in the simulator."
      />
      <LearningCenter />
    </PageContainer>
  );
}