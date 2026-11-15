import type { ReactNode } from "react";
import { Button } from "../Button";
import { PageBody, PageFooter, PageHeader, PageShell, TopBar } from "../Page";

type StepPageProps = {
  backHref: string;
  backLabel: string;
  /** Progress through the flow, e.g. "Krok 1 z 4". */
  stepLabel: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  primaryLabel: ReactNode;
  onPrimary: () => void;
  /** Makes the main button unavailable and says why. */
  disabledReason?: string;
  /** A line above the main button, e.g. "Razem: 9 osób". */
  summary?: ReactNode;
};

/** One layout for every step of a flow: back, title, content, main action. */
export function StepPage({
  backHref,
  backLabel,
  stepLabel,
  title,
  lead,
  children,
  primaryLabel,
  onPrimary,
  disabledReason,
  summary,
}: StepPageProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PageShell>
        <TopBar back={{ href: backHref, label: backLabel }} step={stepLabel} />
        <PageHeader title={title} lead={lead} />
        <PageBody>{children}</PageBody>
        <PageFooter>
          {summary && <p className="text-center text-body-strong">{summary}</p>}
          <Button onClick={onPrimary} disabledReason={disabledReason}>
            {primaryLabel}
          </Button>
        </PageFooter>
      </PageShell>
    </div>
  );
}
