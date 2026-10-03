# ORBIT visual direction

A midnight orbital mechanics notebook, rather than a retail configurator. Cool violet controls, an original detailed spacecraft, NASA surface imagery, open editorial sections, and a utilitarian mission brief. The typography pairs locally served Inter Variable with system monospace. No external runtime fonts, models, image requests, paid generation, or backend. The credited NASA Blue Marble 2002 texture is packaged locally.

The object and its orbit are two views of the same mission. Orbital mechanics affects the four numeric outputs and the plane. Payload and blanket choices change the conceptual spacecraft geometry and appearance only. Deployment changes hinges. The construction sequence explains component roles; it does not pretend to calculate operation.

The library uses readable named rows and an actual parameter comparison table. No invented uptime, science scores, progress bars or launch-readiness ratings. A user can export the exact mission briefs, validate an incoming archive, and undo library mutations.

The scroll scene is deliberately separate from the editable mission canvas. It has its own keyboard view controls, chapter buttons and manual slider. Both GPU scenes render only when visible and dirty. The orbit view is the only continuously moving 3D scene. Pixel ratio is capped at 1.75. Solar cells and fasteners are instanced, fixed details are batched per component/material, and geometry/textures are shared. A single 512 px soft shadow map is used at viewport widths of 600 px or more; smaller views retain the same materials and detail with shadows disabled.

Inter is under SIL OFL 1.1; Three.js is MIT. Dependency licenses remain in the installed packages. The page is an independent educational experiment, with no NASA or ESA branding or implied affiliation.
