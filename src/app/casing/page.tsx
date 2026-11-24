import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { CasingApp } from "@/components/modules/CasingApp";

export const metadata: Metadata = {
  title: "Casing Design",
  description: "Burst, collapse and tension load lines against API casing ratings.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Engineer"
        title="Casing Design"
        description="Build worst-case burst, collapse and tension load lines, apply design factors and screen every API grade for the selected size. Collapse resistance can be de-rated for axial tension with the API biaxial ellipse."
      />
      <CasingApp />
    </PageContainer>
  );
}
