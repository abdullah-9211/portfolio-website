# Abdullah Umar — portfolio

Personal site for Abdullah Umar: software engineer at Veeam, founder and COO at Valkrix. The site tells his career as a story-mode game. It opens on a title screen, turns into a map, and walks through each chapter in order, with three playable games along the way.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS 4, plus plain CSS in `src/styles/`
- Lenis for smooth scrolling
- three.js through `@react-three/fiber` for the globe, the medal and the mascot

Next.js 16 has breaking changes from earlier versions. Check the guides in `node_modules/next/dist/docs/` before changing framework-level code. See `AGENTS.md`.

## Run it

```bash
npm install
npm run dev
```

The dev server defaults to http://localhost:3000. If that port is taken, pass another one:

```bash
npm run dev -- -p 3457
```

| Command | What it does |
| --- | --- |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## How the page is put together

The page is one long scroll, assembled in `src/app/page.tsx`:

1. **Title screen** (`campaign/hero`). A photograph split into layers that separate as you scroll, then a scan line redraws it as a contour map.
2. **The map** (`campaign/map`). Every chapter is a marker. Markers are links, and the same map is used in the pause menu and the minimap.
3. **Chapters** (`campaign/chapters`). FAST NUCES, Securiti.ai, the acquisition cutscene, Veeam, Valkrix and The Forge, then the inventory, side quests and the ending.
4. **Games** (`campaign/games`). What On Earth, Form Check and Gatekeeper.

Around that sits the game layer in `campaign/hud`: the location readout, minimap, toasts, and the pause menu (press `M`).

```
src/
  app/            layout, the page, global CSS entry
  campaign/
    scroll/       ScrollProvider, Act (a pinned scene), Cue (timed content)
    state/        saved progress: regions discovered and trophies
    hero/ map/ chapters/ games/ hud/ ui/ audio/
  components/     a few shared pieces
  data/           content as typed objects
  lib/            contour drawing, reduced-motion hook
  styles/         tokens, base, and one file per area
public/
  photos/ video/ logos/ resume/
scripts/          one-off asset builders
```

### Pinned scenes

`<Act span={3}>` makes a section three viewports tall with a stage that sticks for the duration. It publishes scroll progress from 0 to 1 as the CSS variable `--p` and to the `useActProgress` hook. `<Cue from={0.2} to={0.5}>` shows its children for that window of progress.

One loop in `ScrollProvider` drives every act, so scrolling does not re-render React.

## Changing content

| To change | Edit |
| --- | --- |
| Regions, map positions, trophies, contact details | `src/data/campaign.ts` |
| Projects and their tech | `src/data/projects.ts`, `src/data/tech.ts` |
| Certifications | `src/data/certifications.ts` |
| Chapter copy | the matching file in `src/campaign/chapters/` |
| Gatekeeper's rules and waves | `src/campaign/games/gatekeeper/rules.ts` |
| Form Check's poses | `src/campaign/games/formcheck/poses.ts` |
| What On Earth's events and balance | `src/campaign/games/earth/events.ts` |

To replace the resume, overwrite `public/resume/abdullah-umar-resume.pdf` and keep the filename.

### Replacing the title photo

The title screen needs the photo cut into layers. On a Mac:

```bash
swift scripts/hero/subject-mask.swift path/to/photo.jpg /tmp/mask.png   # writes /tmp/mask-1.png
python scripts/hero/build-layers.py path/to/photo.jpg /tmp/mask-1.png public/photos/hero
```

The Python script needs `opencv-python-headless`, `pillow` and `numpy`. It contains crop coordinates specific to the current photo (the patch that removes two bystanders), so adjust those for a different one. The layout in `src/styles/vista.css` also assumes a 3:4 portrait with the horizon about a third of the way down.

### Other generated assets

| Asset | Rebuild with |
| --- | --- |
| Globe land points | `node scripts/build-land-points.mjs` |
| Skeleton data for the Move clips (`campaign/chapters/pose/`) | start the dev server, then `node scripts/extract-pose.mjs http://localhost:3000` |
| Lettering on the back of the medal | `node scripts/build-medal-font.mjs path/to/Marcellus-Regular.ttf` |

The latte pour and the two game scenes in the side quests are fragment shaders (`campaign/scenes/`). The latte is a small fluid simulation: its pattern comes from the pour path in `LattePour.tsx`, so change the art by changing `pourAt`.

The Link in the Switch scene is a 3D model, `public/models/link.glb`: "Ocarina of Time Link" by projectmgame, licensed CC BY 4.0. The licence requires the credit, which is in the page footer; keep it if the model stays.

The Forge mascot (`public/photos/forge/beaver.webp`) is the supplied artwork with its background removed, plus a height map (`beaver-depth.webp`) that the shader in `campaign/ui/BeaverScene.tsx` uses to fake depth and lighting.

## Design rules

- Colours, type sizes and easing live in `src/styles/tokens.css`. Use the tokens.
- Ember (orange) marks what is still ahead on the map. Rune (cyan) means "visited" or "done". Gold is for banners, trophies and game highlights. Buttons are parchment or outlined, never orange.
- Every animation needs an answer for `prefers-reduced-motion`. Use `useReducedMotion` from `components/primitives/ReducedMotionProvider`.
- Games must work with a keyboard and on touch, and pause when scrolled off screen.
- Progress is saved in `localStorage` under `au-campaign-save-v1`. Sound is off until the visitor turns it on.

`PORTFOLIO_BRIEF.md` holds the original content brief and source facts. Its design section describes an earlier version of the site.
