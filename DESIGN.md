# Design

## Visual Theme
A clean, professional learning app framed by a **3D low-poly diorama world**. It is taken directly from Dulatuon's three.js simulations: flat-shaded terrain blocks, layered earth strata, toy-scale houses and trees, under a sky-to-sand gradient. There are two moods:
- **Day (app default):** a light, airy workspace. Sky-tinted backgrounds and white, chunky, softly elevated panels.
- **Night (game mode):** deep slate→violet surfaces for games, immersive heroes, results and celebrations. This is also what dark mode maps to.

The style is claymorphism-lite: soft depth, generous radii and pressable controls. It stays restrained, with no pastel overload and no glow.

## Color Palette
| Role | Value | Source |
|---|---|---|
| Primary (actions, active states) | violet-600 `#7c3aed` / hover violet-700 | Game CTAs, toggles, eyebrows |
| Ink / night surface | slate-900 `#0f172a`, violet-950 `#2e1065` | Game page background |
| Brand deep | indigo `#1e2a6e` | Logo, headings on light |
| Play CTA | orange-500 `#f97316` → red-500 `#ef4444` gradient | "Release the earthquake" button |
| Sky | sky-300 `#7dd3fc` → sky-100 `#e0f2fe` | Scene background |
| Sand | amber-100 `#fef3c7` | Scene horizon |
| Grass / success | green-600 `#16a34a` (scene `#38a352`) | Terrain top |
| Earth | `#a0703f` / `#7b4a2a` / `#55301c` | Strata layers |
| XP / reward | amber-400 `#fbbf24` | Coins, stars |
| Danger / warn / caution | red-600, orange-500, yellow-400 | Intensity chips VIII / VI–VII / V |
| Neutral text | slate-900 / slate-600 (muted, minimum) | — |

## Typography
- **Display / headings:** Bricolage Grotesque (600–800), with tight tracking (-0.02 to -0.04em). It has character and confidence and is premium without being childish.
- **Body / UI:** Figtree (400–800). Clean and friendly, and highly legible on low-res phone screens.
- Brand voice words: tactile, geological, quietly confident.
- Scale: 12 / 14 / 16 (body) / 18 / 20 / 24 / 30 / 36 / 48. Body line-height is 1.6.
- Eyebrows: 12px uppercase, tracking-wider, bold, violet-600 (the game panel pattern). Use them inside panels only, never as a label stacked above every section heading.

## Worlds system (internal term)
**Terminology in user-facing copy:** Course > Module > Unit > Lesson. Say "course", never "world"; "lesson", never "session"; "unit" for what the code calls a lesson group. "World" is only the internal name for a course's visual theme.

Dulatuon is one science platform; each course gets its own theme. The registry lives in `resources/js/lib/worlds.ts`:

| World | Accent | Icon | Biome |
|---|---|---|---|
| Earthquakes (World 1) | `#c2410c` | Activity | earth strata block |
| Volcanoes | `#dc2626` | Mountain | cone + lava |
| Weather & Typhoons | `#0284c7` | CloudLightning | storm cloud |
| Oceans | `#0d9488` | Waves | water block |
| Space | `#4f46e5` | Orbit | planet + stars |
| Life Science | `#16a34a` | Leaf | forest |
| Science (default) | `#7c3aed` | FlaskConical | grass + lab |

- **Colour rule:** brand violet is for actions, links and focus everywhere. A world accent is for identity only: the card cover tint, `WorldChip`, `WorldEmblem`, the course player header bar, module hexagons, the quest trail and game emblems.
- **Resolution:** a course's world comes from `course.world` (backend, future), then a keyword match on the title or code, then `default`. 3D labs register their world in `SIMULATION_WORLD`.
- **Art:** `LowPolyBlock biome=…` is the same isometric block for every world, so they read as one family.
- **The depth device** (strata, km markers) belongs to the Earthquakes world only, not to the platform brand.

## Anti-template rules
No gradient text, no identical icon-card grids, no icon tiles above headings, no fake floating UI, no glow blobs, no repeated uppercase section labels, no coloured side stripes.

## Elevation & Shape
- Radius: controls 14px (`rounded-xl`), cards 20–24px (`rounded-2xl`/`3xl`), pills fully rounded.
- **Pressable "block" shadow:** a solid offset bottom edge (`0 4px 0 <darker shade>`). It drops to 2px and the element moves down 2px on press. It is used for primary buttons, answer tiles and game cards.
- Panels: white with a 1px `slate-200` border and a soft ambient shadow. On night, `white/5` surfaces with a `white/10` border.

## Components (signature)
- **HudPill:** a slate-900/70 pill with white bold text (game labels), plus colour variants. Used for status, counters, XP and step labels.
- **Panel:** the game side-panel pattern (eyebrow, title, muted body, then actions).
- **AnswerTile:** an outlined rounded tile with idle, hover, selected (violet), correct (green) and wrong (red) states, pressable.
- **XpBar / ProgressBar:** a thick rounded track with a violet fill (or the cyan→yellow→red "stress" gradient for intensity).
- **QuestCard:** a course or module card with a low-poly diorama thumbnail, progress and a play CTA.

## Motion
- 150–250ms ease-out for UI, and spring for press and pop.
- Celebrations (confetti, level up) last under 1.2s and are skippable.
- Everything is disabled or reduced under `prefers-reduced-motion`.
- Animate transform and opacity only.

## Layout
- Mobile-first: one column at 360px, a sidebar shell from `lg`, max content width 1280px.
- Gap-based spacing: 16 / 24 / 32.
