# CapyDindon painted prop sprites

Painted replacements for gameplay objects that are still drawn as Three.js primitives.
Files are lossy WebP at quality 90, with alpha preserved. Creatures face right.
Suggested heights are in world units (Capy's idle sprite is 1.68 tall; the gameplay hitbox is 1.0).
"Capy heights" is suggested world height ÷ 1.68.

`src/game/render/props.ts` draws these as alpha-tested sprite planes, with a contact shadow and the scene rim tint. Hitboxes stay in the logic files.

## Mapping

| File | Replaces | State | Dimensions | Suggested height | vs Capy |
| --- | --- | --- | ---: | ---: | ---: |
| `crate.webp` | `src/game/render/scenery.ts` `crateModel()`; pantry pushable boxes in `src/game/scenes/pantry.ts` / `src/game/logic/puzzle.ts` | one pose | 779×692 | 0.88 (matches current 0.88×0.88 box) | 0.52 |
| `plate-up.webp` | Inline `BoxGeometry` plates in `src/game/scenes/pantry.ts` (`#8d6bdb`) | unpressed / raised inner square, dimmer purple gem | 958×602 | width 1.20 (matches `plate.w`); visual height ~0.62 | width 0.71 |
| `plate-pressed.webp` | Same plates, when `sim.platesPressed()` is true | flush tile, brighter purple gem | 967×613 | width 1.20; visual height ~0.58 | width 0.71 |
| `gate-closed.webp` | Pantry grate, five vertical bars in `src/game/scenes/pantry.ts` | closed, bars in the frame | 590×1045 | 2.60 (matches bar height) | 1.55 |
| `gate-open.webp` | Same grate when `sim.gateOpen` | open, empty openings, same frame | 596×1057 | 2.60 | 1.55 |
| `pedestal.webp` | Pedestal under the feather, `BoxGeometry(1.4, 0.32, 0.8)` in `src/game/scenes/pantry.ts` | rustic short table with legs | 853×519 | 0.62 (the painted table is taller than the 0.32 box; keep the tabletop under the feather) | 0.37 |
| `feather.webp` | `src/game/render/scenery.ts` `featherModel()`; pantry pickup and title/intro grove (`src/game/render/grove.ts`) | one pose, "Plume sacrée" | 531×946 | 0.80 | 0.48 |
| `acorn-gold.webp` | `src/game/render/scenery.ts` `acornModel()`; eight collectibles in `src/game/scenes/acorn.ts` | one pose, soft gold aura | 658×755 | 0.35 | 0.21 |
| `pumpkin-normal.webp` | `src/game/render/scenery.ts` `pumpkinModel()` as the Îles aux glands patrol hazard in `src/game/scenes/acorn.ts` | friendly pumpkin, no face | 651×609 | 0.60 (hazard is currently w=0.72, h=0.68) | 0.36 |
| `pumpkin-trapped.webp` | Same `pumpkinModel()` used as the Parade "bomb" in `src/game/scenes/parade.ts` | glowing carved evil face | 649×621 | 0.60 | 0.36 |
| `turkey-idle.webp` | `src/game/render/scenery.ts` `turkeyModel()`; Parade pop-up when a hole is `kind==='turkey'` and `phase==='up'` | planted stance, facing right | 793×876 | 1.15 (matches current turkey scale) | 0.68 |
| `turkey-walk-1.webp` | Same turkey, walk cycle frame 1 | forward stride, facing right | 783×827 | 1.15 | 0.68 |
| `turkey-walk-2.webp` | Same turkey, walk cycle frame 2 | stride variant, facing right (subtle; not a full opposite gait) | 783×833 | 1.15 | 0.68 |
| `portal-idle.webp` | Inline `RingGeometry` portal in `src/game/scenes/acorn.ts` | dim, before 8 acorns are collected | 849×1078 | 1.60 | 0.95 |
| `portal-open.webp` | Same portal when open (opacity 0.95, scale pulse) | brighter gold glow in the opening | 850×1076 | 1.60 (current open scale is 1.35) | 0.95 |
| `star.webp` | `src/game/render/scenery.ts` `starModel()`; Parade relic "Étoile farceuse" | one pose, soft gold aura | 730×704 | 0.45 | 0.27 |

## Notes

- Pressure plates are a 3/4 view of a square wooden tile. Size them by **width** (1.20) rather than the old 0.08 box thickness.
- The pedestal is a short wooden table, not a 0.32-tall plinth. Anchor the tabletop and stand the feather on it.
- `turkey-idle` is the main Parade pop-up pose (turkeys rise from holes rather than walk). The two walk frames are for a cycle if one is added later.
- `pumpkin-normal` is also the Îles aux glands rolling/patrol hazard; `pumpkin-trapped` is the Parade bomb tell.
- CSS HUD relic pips in `src/game/ui.ts`, particles, and unused 3D scenery (`dressCamp`, `dressGrove`, `archway`, `totem`) are not covered here.

## Totals

- 16 WebP files
- 1.49 MiB
