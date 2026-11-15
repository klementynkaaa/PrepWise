import { Illustration, PageBody, PageHeader, PageShell, Logo } from "@/components/ui";

// A calm placeholder until the real Start screen (S-01) lands.
export default function Home() {
  return (
    <PageShell>
      <div className="px-5 pt-4 pb-2">
        <Logo />
      </div>
      <PageHeader
        title="Przygotuj dom na trudne dni"
        lead="PREPWISE pomoże Ci krok po kroku zebrać zapasy awaryjne dla całego domu — także bez internetu."
      />
      <PageBody>
        <Illustration name="hero-welcome" />
      </PageBody>
    </PageShell>
  );
}
