# Verification

The final local production audit passes **16/16 core browser checks and 5/5 additional stress checks**. Model, archive and timeline tests pass **6/6**. ESLint, TypeScript and the production build pass.

Three substantial review rounds covered layout, contrast, motion, data safety and recovery. The last correction fixed a wrapping issue at 320 px with Kazakh text enlarged to 200%; that complete save/compare workflow now passes, together with the construction scene's WebGL recovery test.

## Coverage

- Desktop, tablet, portrait and landscape layouts, including English, Russian and Kazakh at 320–1440 px.
- Presets, altitude/inclination endpoints, polar and retrograde planes, keyboard camera rotation, native emulated touch scrolling, panel deployment, timeline pause/speed/reset, and reversible construction chapters.
- Named saves, updates, deletion, undo, two-project comparison, JSON download, merge/replacement review, cancelled/repeated actions, stale file reads, malformed imports and name collisions.
- Blocked storage, preserved corrupt data, explicit replacement, and prevention of silent overwrites between two tabs.
- Reduced motion, 200% text, constrained tooltips, real WebGL unavailability, and loss/recovery of both rendering contexts while configuration changes.
- Offscreen/hidden-page pausing, bounded renderer pixel density and projected scene bounds. The orbit remains framed at the maximum altitude and with a polar plane.

The six unit tests independently check a 400 km reference orbit, constant radius, period/speed consistency, orbital direction and latitude, frame-time caps and wrapping, archive round trips, validation, capacity and atomic merging. See [MODEL.md](MODEL.md) for equations, conventions and sources.

## Motion evidence

Actual browser canvas recordings cover a circular orbit at 300× model time, solar-wing folding/unfolding, and forward/reverse construction scrolling. Each recording was decoded and reviewed through seven sampled frames. Recordings and contact sheets remain in the local `evidence/motion/` directory; generated evidence is excluded from the repository.

The representative main scene uses approximately 78 draw calls and 3,280 triangles for the spacecraft, and 8 calls and 5,208 triangles for the orbit. Rendering is visibility-aware; pixel density is capped at 1.75.

## Reproduce

Use Node 24, then `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Install Chromium with `npx playwright install chromium`, start `node scripts/serve.mjs`, and run both browser scripts with `ORBIT_URL=http://127.0.0.1:5516/orbit-studio/`. Set `ORBIT_EVIDENCE` to choose the evidence directory.

The publication workflow repeats these checks against the production build on Linux Chromium before deploying. Local checks used installed Chrome on Windows with viewport/touch emulation. Physical phones and Safari were not tested. The model is educational and idealized; none of these checks establish operational spacecraft readiness or real tracking accuracy.
