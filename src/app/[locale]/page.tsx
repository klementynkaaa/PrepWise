import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ButtonLink, FactChip, Illustration, Logo, PageFooter, PageShell } from "@/components/ui";
import { WelcomeGate } from "@/features/household/WelcomeGate";
import { localePath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Welcome: shown at "/pl" unless a household is saved (WelcomeGate resumes it).
// On a phone the content is centred and the button sits in the footer. From
// `md` up everything is one centred column with the button under the content.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("welcome");

  return (
    <WelcomeGate locale={locale}>
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
            <h1 className="text-display text-balance md:text-display-lg">{t("title")}</h1>
            <p className="text-body text-pretty md:text-lead">{t("lead")}</p>
            <div className="flex justify-center">
              <FactChip>{t("worksOffline")}</FactChip>
            </div>
          </main>
          <PageFooter>
            <div className="flex flex-col md:w-full md:max-w-cta md:self-center">
              <ButtonLink href={localePath("/start", locale)}>{t("start")}</ButtonLink>
            </div>
          </PageFooter>
        </div>
      </PageShell>
    </WelcomeGate>
  );
}
