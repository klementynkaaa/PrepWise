import { Logo } from "../Logo";
import { SaveStatus, type SaveState } from "../Status";

type AppHeaderProps = {
  /** Where the data is. Left out, the header shows only the logo. */
  saveState?: SaveState;
};

/**
 * Top bar of the app: logo on the left, save status on the right, inside the
 * app column at every width. At large text the status wraps under the logo.
 */
export function AppHeader({ saveState }: AppHeaderProps) {
  return (
    <header className="mx-auto flex min-h-14 w-full max-w-app flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
      <Logo size="sm" />
      {saveState && <SaveStatus state={saveState} />}
    </header>
  );
}
