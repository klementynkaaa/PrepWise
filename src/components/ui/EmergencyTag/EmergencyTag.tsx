import { Icon } from "../Icon";

type EmergencyTagsProps = {
  /**
   * Heard by screen readers before the names, e.g. "dodane na sytuację:"
   * (from the caller's messages). Not shown.
   */
  lead: string;
  /** Names of the emergencies that added the item, e.g. ["Brak prądu"]. */
  names: string[];
};

/**
 * Small pills with a plus icon naming the emergencies that added an item.
 * Sits under a row's caption, on the left. Renders nothing for an empty list.
 */
export function EmergencyTags({ lead, names }: EmergencyTagsProps) {
  if (names.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      <span className="sr-only">{lead}</span>
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex min-w-0 items-center gap-1 rounded-full bg-notice-bg px-2 py-0.5 text-label text-accent-pressed"
        >
          <Icon name="plus" />
          <span className="min-w-0 break-words">{name}</span>
        </span>
      ))}
    </span>
  );
}
