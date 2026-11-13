import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes } from "./routes";

const blocking = ["serious", "critical"];

for (const route of routes) {
  test(`accessibility: ${route.name} (${route.path})`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    for (const v of violations.filter((x) => !blocking.includes(x.impact ?? ""))) {
      testInfo.annotations.push({
        type: `a11y-${v.impact ?? "unknown"}`,
        description: `${v.id}: ${v.helpUrl}`,
      });
    }

    const failing = violations.filter((v) => blocking.includes(v.impact ?? ""));
    const message = failing
      .map(
        (v) =>
          `${v.id} [${v.impact}] ${v.helpUrl}\n` +
          v.nodes.map((n) => `  - ${n.target.join(" ")}`).join("\n"),
      )
      .join("\n");
    expect(failing, message).toEqual([]);
  });
}
