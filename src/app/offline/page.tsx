import Link from "next/link";

export const metadata = { title: "Brak połączenia" };

// Shown by the service worker for pages that aren't saved on the device.
// Every regular PREPWISE page is saved, so this should be rare.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Brak połączenia z internetem</h1>
      <p>
        Ta strona nie jest zapisana na Twoim urządzeniu. Twój plan i lista zakupów działają bez
        internetu.
      </p>
      <Link href="/" className="underline">
        Wróć do strony głównej
      </Link>
    </main>
  );
}
