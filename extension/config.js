// Where the extension finds the LeetPro web app. This checked-in copy targets
// local development. `pnpm extension:build --api-base https://your.domain`
// writes a production copy into dist/extension/ and points the manifest's
// host_permissions at the same origin, so the two can never drift apart.
// `env` matches the web app's ENV: anything but "prod" shows a DEV marker in
// the popup and on the toolbar icon.
self.LEETPRO_CONFIG = {
  apiBase: "http://localhost:3000",
  env: "dev",
};
