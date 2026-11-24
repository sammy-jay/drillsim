import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { PorePressureApp } from "@/components/modules/PorePressureApp";

export const metadata: Metadata = {
  title: "Pore Pressure & Fracture Gradient",
  description: "Eaton pore pressure, fracture gradient, mud window and casing seat selection.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Engineer"
        title="Pore Pressure & Fracture Gradient"
        description="Interpret a shale sonic log with Eaton's method, derive the fracture gradient from overburden and Poisson's ratio, and pick casing seats bottom-up so that every open-hole section stays inside its mud-weight window."
      />
      <PorePressureApp />
    </PageContainer>
  );
}
