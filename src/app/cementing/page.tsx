import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/Panel";
import { CementingApp } from "@/components/modules/CementingApp";

export const metadata: Metadata = {
  title: "Cementing",
  description: "Slurry volumes, sacks, displacement and a U-tube simulation of a primary cement job.",
};

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Engineer"
        title="Primary Cementing"
        description="Size a two-slurry primary cement job, then pump it: watch spacer, lead and tail travel down the casing and up the annulus while the U-tube effect drives the surface pressure to the final differential at plug bump."
      />
      <CementingApp />
    </PageContainer>
  );
}
