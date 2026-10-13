# Typography and motion

The interface uses Thmanyah Sans for controls, tables and body copy, and Thmanyah
Serif Display for page titles. The existing Arabic line-height and diacritic
guards remain in place. Explicit tenant brand font choices are preserved.

## Fonts

- `src/styles/fonts.css` defines the font faces and the `--font-ui` /
  `--font-display` tokens. Tailwind and Material UI share these tokens.
- Font URLs reference the assets served by the official
  [Thmanyah font site](https://font.thmanyah.com/). No font binaries are included
  in this repository. Availability depends on the provider's CDN; system fonts
  remain available through `font-display: swap` and fallback stacks.
- Consult the [provider's license](https://font.thmanyah.com/licenses) before
  changing how fonts are distributed or hosted. Do not copy the font files into
  `public/` or a downloadable bundle.
- The regular body face is preloaded once. Other weights load only when used.
  Google icon fonts and existing tenant typography options remain supported.
- `documentFonts.ts` makes popup print views use the same fonts and waits for
  font loading before print/PDF/canvas exports, with a four-second offline bound.

## GSAP

`useLandingMotion` owns the hero reveal sequence, match-score bar, floating
widgets, section-title reveals and desktop pointer response on the two primary
links. It targets explicit `data-*` attributes; do not animate the same nodes
with Framer Motion or CSS transforms.

`AnimatedCount` supplies landing and dashboard counters while keeping final
values available to assistive technology. `PageTransition` handles dashboard
and marketing content entry using opacity, so fixed-position dialogs keep
their viewport positioning. Existing Framer Motion components remain in use.

GSAP contexts revert on unmount and preference changes. Floating hero widgets
pause outside the viewport and when the tab is hidden. Pointer effects run only
on devices with a fine pointer and hover support.

## Three.js

`TalentOrbit` progressively enhances a static SVG with a texture-free scene
connecting the Tawzeef X to orbiting talent nodes. It appears in the landing
page's existing product preview. The renderer module and `vendor-three` chunk
load only after the illustration becomes visible and the browser is idle.

- Reduced motion, disabled workspace animations, data saving, devices reporting
  2 GB RAM or less, and unavailable WebGL use the static illustration.
- Rendering is capped at 30 fps and 1.25–1.5 device pixel ratio. It pauses when
  offscreen or when the document is hidden.
- Resize and theme changes are observed without React updates on every frame.
- Renderer failure or context loss restores the SVG. Unmounting disposes
  geometries, materials, the renderer and GPU context, and removes observers,
  animation frames and event listeners.

## Preferences and verification

The existing `workspace-animations` setting updates GSAP, Three, CSS and the
shared Framer Motion configuration. The operating system's reduced-motion
preference takes precedence and changes are applied live across tabs.

Run:

```sh
npm ci
npm test
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

`motion-preferences.test.tsx` covers live preference changes, OS precedence,
cross-tab updates, transition cleanup and final counter values.
`talent-orbit.test.tsx` covers deferred initialization, visibility, disposal,
reduced motion and WebGL failure. For visual checks use a local preview with
mocked Supabase data. Unit test setup points to a local placeholder endpoint,
never the production project. Include desktop/mobile, both themes, Arabic/English,
font failure, GPU context loss and navigation away from the landing page.
