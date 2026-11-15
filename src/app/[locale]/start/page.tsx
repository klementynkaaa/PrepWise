import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EmptyState, PageShell, TopBar } from "@/components/ui";
import { localePath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/start">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "start" });
  return { title: t("metaTitle") };
}

// A calm placeholder for the "Zaczynamy" button until S-01 (household profile)
// replaces this file.
export default async function StartPage({ params }: PageProps<"/[locale]/start">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("start");
  const common = await getTranslations("common");

  return (
    <PageShell>
      <TopBar back={{ href: localePath("/", locale), label: common("back") }} />
      <main className="flex flex-1 flex-col justify-center px-4 pb-6">
        <EmptyState illustration="empty-kit" headingLevel={1} title={t("title")}>
          {t("body")}
        </EmptyState>
      </main>
    </PageShell>
  );
}
