// Pure rule for UI components, used by scripts/check-ui-stories.mjs.
// A PR that adds or changes a component in src/components/ui/ must also add or change a
// Storybook story there, unless it carries the `no-story-needed` label.

export const NO_STORY_LABEL = "no-story-needed";

const COMPONENT = /^src\/components\/ui\/[^/]+\.tsx$/;
const NOT_COMPONENT = /\.(stories|test)\.tsx$/;
const STORY = /^src\/components\/ui\/[^/]+\.stories\.tsx$/;

export function isComponentFile(path) {
  return COMPONENT.test(path) && !NOT_COMPONENT.test(path);
}

export function isStoryFile(path) {
  return STORY.test(path);
}

// `changedFiles` are the paths added, modified or renamed in the PR.
// Returns a list of human-readable failures; empty means the PR is fine.
export function checkUiStories({ changedFiles = [], labels = [] }) {
  if (labels.includes(NO_STORY_LABEL)) return [];
  const components = changedFiles.filter(isComponentFile);
  if (components.length === 0 || changedFiles.some(isStoryFile)) return [];
  return [
    `UI component changed (${components.join(", ")}) but no Storybook story in src/components/ui/ changed. ` +
      `Add or update a *.stories.tsx with a story per state, or add the "${NO_STORY_LABEL}" label for a change that needs none (for example a refactor with no visible difference).`,
  ];
}
