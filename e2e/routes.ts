// Every route the browser tests visit (offline reload + accessibility scan).
// Add new pages here. `profile: true` marks pages that need a saved, complete
// household: without one they send the visitor to an earlier step, so the
// tests save one first (see seed.ts). `plan: true` marks pages that also need
// a plan created on this device; the tests create it through the UI first, so
// keep them after the `profile` routes.
export const routes: { path: string; name: string; profile?: true; plan?: true }[] = [
  { path: "/pl", name: "home" },
  { path: "/pl/start", name: "start" },
  { path: "/pl/start/people", name: "people", profile: true },
  { path: "/pl/start/pets", name: "pets", profile: true },
  { path: "/pl/start/housing", name: "housing", profile: true },
  { path: "/pl/start/needs", name: "needs", profile: true },
  { path: "/pl/household", name: "household", profile: true },
  { path: "/pl/plan", name: "plan", profile: true },
  { path: "/pl/home", name: "home-hub", profile: true, plan: true },
  { path: "/offline", name: "offline" },
];
