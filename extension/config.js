// Where the extension finds the LeetPro web app. This checked-in copy targets
// local development. `pnpm extension:build --api-base https://your.domain`
// writes a production copy into dist/extension/ and points the manifest's
// host_permissions at the same origin, so the two can never drift apart.
self.LEETPRO_CONFIG = {
  apiBase: "http://localhost:3000",
};
