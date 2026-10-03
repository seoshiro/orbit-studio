# The ORBIT model

ORBIT demonstrates a circular, two-body orbit around a spherical Earth. It is a conceptual learning tool, with no epoch, telemetry connection or flight-readiness claim.

| Quantity | Value or equation | Reference |
| --- | --- | --- |
| Mean Earth radius, R | 6,371 km | [NASA Earth fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html), volumetric mean |
| Earth gravitational parameter, μ | 398,600.435507 km³/s² | [NASA/JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html) |
| Orbital radius, r | R + altitude | Height is measured above the mean spherical surface |
| Circular speed, v | √(μ/r) | Circular balance of gravitational and centripetal acceleration |
| Period, T | 2π√(r³/μ) | [NASA: circular orbit and Kepler's third law](https://pwg.gsfc.nasa.gov/stargaze/Skepl3rd.htm) |
| Revolutions per model day | 86,400 / T | A model day is exactly 86,400 seconds |
| Geocentric latitude reach | ±min(i, 180° − i) | Latitude of the circular plane's position vector |

For a 400 km altitude, r = 6,771 km, v ≈ 7.672599 km/s, and T ≈ 5,544.855140 s (92.414252 minutes). Tests check this independent reference and radius/direction invariants.

## Geometry and inclination

The scene uses a Y-up coordinate system and an equatorial XZ plane. At phase θ and inclination i, position is `(r cos θ, r sin θ sin i, −r sin θ cos i)`. The orbital plane, transparent plane indicator and moving marker use this same convention. At 0° angular momentum points along +Y; above 90° it points into the retrograde hemisphere. The ascending node is fixed. [NASA's orbital mechanics overview](https://science.nasa.gov/learn/basics-of-space-flight/chapter5-1/) describes the 0° prograde, 90° polar and 180° retrograde conventions.

Earth and the path share one distance scale. The spacecraft marker is enlarged for visibility. Surface imagery is the historical NASA Blue Marble 2002 composite, not current weather or a navigation map. Earth is shown without rotation, and no ground track is calculated. Lighting is illustrative; there is no sunlight, eclipse or day/night calculation.

## Time

The time display is elapsed model time, starting at zero. Selecting 1×, 60× or 300× controls model seconds per displayed second. Time advances only while the main scene is visible and the document is active. Pause and phase scrubbing are explicit. Per-frame time is capped at 0.1 seconds to avoid large jumps after interruptions; this can slow the nominal rate during severe frame drops. This is not a real-time ephemeris.

## Spacecraft construction

The bus, thermal blanket, radiator, onboard electronics, battery, reaction wheels, payload, antenna and solar wings are original parametric geometry. Chamfered plates, fasteners, hinges, limited cabling, irregular blanket surfaces, recessed dielectric optics and cover-glass solar cells illustrate component construction. Part origins, explosion directions and wing pivots are preserved. Their educational roles follow [ESA's satellite anatomy overview](https://www.esa.int/Applications/Satellite_navigation/Galileo/Satellite_anatomy). Folding wings reveal a mechanical concept; payload and blanket selections change the visible concept. ORBIT does not calculate a power budget, temperature, data rate or attitude dynamics.

Atmospheric drag, Earth oblateness, third bodies, maneuvers, orbital decay and operational constraints are omitted. Altitude and inclination are the only physical orbit inputs; this idealized circular model keeps the calculation understandable and testable.
