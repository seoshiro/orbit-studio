# ORBIT

An original interactive satellite mission studio. Configure a conceptual spacecraft, explore a circular orbit around Earth, separate its construction layers, and keep a local mission library. English, Russian and Kazakh.

[Open ORBIT](https://seoshiro.github.io/orbit-studio/) · [Educational model and primary references](docs/MODEL.md) · [Verification](docs/VERIFICATION.md)

## Explore

- Three study presets, altitude 250–2,000 km and inclination 0–180°, including polar and retrograde planes.
- Original parametric spacecraft with optical/radio payloads, thermal blankets and articulated solar wings; schematic Earth with a consistently scaled orbital path.
- Calculated period, speed, latitude reach and revolutions per model day. Pause, 1×/60×/300× model time, phase scrubbing, reset, keyboard rotation and touch controls.
- Five reversible construction chapters, with manual controls for short viewports, enlarged text and reduced motion.
- Eight named local saves, update/delete confirmation, undo, comparison and validated JSON import/export. Import previews support atomic merging or explicit replacement.
- Preservation of unreadable data, session-only operation when storage is blocked, and protection against silent overwrites between tabs.
- SVG diagrams when WebGL is unavailable, and recovery of both rendering contexts.

This is an explicitly idealized educational model. It provides no operational tracking, telemetry, power simulation or flight-readiness assessment. The moving marker is enlarged; lighting and geography are illustrative. All assumptions and NASA/ESA references are visible in the application.

## Run

Use Node 24:

```sh
npm ci
npm run dev
```

Development runs at `http://127.0.0.1:5515/`. `npm run build` creates a static relative-path `dist/`, with a restrictive Content Security Policy and a release version manifest. Preview the same deployment path with `node scripts/serve.mjs` at `http://127.0.0.1:5516/orbit-studio/`.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
```

Start the production server, set `ORBIT_URL=http://127.0.0.1:5516/orbit-studio/`, then run `npm run test:browser`, `npm run test:browser:extra` and `npm run test:browser:model`. On Windows these scripts use installed Chrome; elsewhere they use Playwright Chromium. CI runs the complete production checks before GitHub Pages publication.

`scripts/motion.mjs` records actual canvas motion through MediaRecorder. `scripts/review-motion.mjs` decodes the clips into review frames. Generated screenshots, recordings and reports stay in the ignored local `evidence/` directory. Browser device emulation is used; physical phones and Safari are not claimed as tested.

## Credits

Original application, geometry, foil normal/roughness textures and solar-cell texture. Earth uses the locally packaged NASA Blue Marble 2002 surface composite; see [asset attribution](docs/ASSETS.md). Three.js is MIT licensed; locally bundled Inter Variable is under the SIL Open Font License. Scientific references are credited for their equations and component explanations, with no NASA or ESA affiliation implied. No backend, analytics, paid generation or external API is required.
