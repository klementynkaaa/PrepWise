import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { IndexedDbHouseholdProvider } from "@/features/household/IndexedDbHouseholdProvider";
import { routing } from "@/i18n/routing";
import { RootShell, rootMetadata, rootViewport } from "../root-shell";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta" });
  return rootMetadata({
    appName: t("appName"),
    title: t("title"),
    description: t("description"),
  });
}

export const viewport = rootViewport;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <RootShell lang={locale}>
      <NextIntlClientProvider>
        <IndexedDbHouseholdProvider>{children}</IndexedDbHouseholdProvider>
      </NextIntlClientProvider>
    </RootShell>
  );
}
