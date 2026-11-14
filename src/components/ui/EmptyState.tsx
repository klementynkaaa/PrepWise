import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "./Illustration";

type EmptyStateProps = {
  illustration: IllustrationName;
  title: ReactNode;
  /** One calm sentence: what happened and what to do. */
  children: ReactNode;
  /** Optional button, e.g. <ButtonLink href="/">Wróć</ButtonLink>. */
  action?: ReactNode;
  /** "h1" when the state is the whole screen (e.g. offline). */
  headingLevel?: 1 | 2;
};

/** Art, a heading, one sentence and an optional action, centred. */
export function EmptyState({
  illustration,
  title,
  children,
  action,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
      <Illustration name={illustration} />
      <Heading className={headingLevel === 1 ? "text-display text-balance" : "text-title"}>
        {title}
      </Heading>
      <p className="max-w-prose text-body">{children}</p>
      {action && <div className="flex w-full flex-col pt-2">{action}</div>}
    </div>
  );
}
