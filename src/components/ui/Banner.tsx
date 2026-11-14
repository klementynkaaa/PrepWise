import type { ReactNode } from "react";
import { Illustration, type BannerIllustrationName } from "./Illustration";

type BannerProps = {
  title: ReactNode;
  /** One short sentence. */
  children: ReactNode;
  illustration: BannerIllustrationName;
  /** Element for the title: a plain paragraph by default; pick the heading level that fits the screen. */
  titleAs?: "p" | "h2" | "h3" | "h4";
};

/**
 * Rounded block with a banner illustration as its background and a short title
 * plus one sentence on the empty left half. At large text (container query on
 * its own width) the text moves into its own block above the art, so nothing
 * clips or overlaps.
 */
export function Banner({ title, children, illustration, titleAs: Title = "p" }: BannerProps) {
  return (
    <div className="@container overflow-hidden rounded-lg bg-notice-bg">
      <div className="grid">
        <div className="col-start-1 row-start-1 @max-banner-stack:row-start-2">
          <Illustration name={illustration} />
        </div>
        <div className="col-start-1 row-start-1 flex w-1/2 flex-col justify-center gap-1 p-4 @max-banner-stack:w-full">
          <Title className="text-heading-sm text-ink">{title}</Title>
          <p className="text-body-sm text-ink">{children}</p>
        </div>
      </div>
    </div>
  );
}
