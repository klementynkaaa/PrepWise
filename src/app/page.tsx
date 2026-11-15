import { ButtonLink, FactChip, Illustration, Logo, PageFooter, PageShell } from "@/components/ui";

// Welcome: shown at "/" until S-01 adds the check for an existing household.
// On a phone the content is centred and the button sits in the footer. From
// `md` up everything is one centred column with the button under the content.
export default function Home() {
  return (
    <PageShell>
      <div className="flex flex-1 flex-col md:my-auto md:flex-none">
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-7 py-6 text-center md:flex-none md:px-4 md:pb-2">
          {/* Only one logo is displayed (display: none leaves the other out of the accessibility tree). */}
          <div className="mb-5 md:hidden">
            <Logo size="md" />
          </div>
          <div className="mb-1 hidden md:block">
            <Logo size="lg" />
          </div>
          <Illustration name="hero-welcome" />
          <h1 className="text-display text-balance md:text-display-lg">
            Spokój zaczyna się od przygotowania.
          </h1>
          <p className="text-body text-pretty md:text-lead">
            Zadbaj o bezpieczeństwo swoje i swoich bliskich. Dowiedz się, co warto przygotować na
            nieprzewidziane sytuacje.
          </p>
          <div className="flex justify-center">
            <FactChip>Działa bez internetu</FactChip>
          </div>
        </main>
        <PageFooter>
          <div className="flex flex-col md:w-full md:max-w-cta md:self-center">
            <ButtonLink href="/start">Zaczynamy</ButtonLink>
          </div>
        </PageFooter>
      </div>
    </PageShell>
  );
}
