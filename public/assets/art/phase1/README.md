# CapyDindon Phase 1 painted art

Chase scene (Ruée des Citrouilles) and new gameplay sprites: baby capys, Lumi, bounce mushrooms, lantern checkpoints, a pumpkin herd, a temporary glide feather and pose, a pantry shelf and a floor hatch.

Cutouts were redone from the raw generations (border flood-fill, eroded alpha matte, defringe and edge decontamination) so sprites no longer keep a white or mauve studio backdrop. Files are lossy WebP at quality 90, with alpha preserved on every transparent layer. The chase sky is opaque RGB; far, mid and ground are RGBA. Creatures face right where a side view applies.

Suggested heights are in world units (Capy's idle sprite is 1.68 tall; the gameplay hitbox is 1.0). "vs Capy" is suggested world height ÷ 1.68.

These assets are wired on the `cursor/phase1-levels` branch (draft PR #4). They are not merged or deployed.

## Chase scene (`scenes/chase/`)

Composite order: `sky`, then `far`, then `ground`, then `mid` shifted by `dy` (positive `dy` moves mid down). Layers are 1280×720 and are **not** pre-shifted — apply the mid `dy` at composite time. The preview used `mid_dy = -40` so the foliage sits on the sloped islands.

| File | Size | Dimensions | Notes |
| --- | ---: | --- | --- |
| `sky.webp` | 122 KB | 1280×720 RGB | Warm sunset sky with planets. Graded slightly cooler than the raw paint; still a cozy peach sky, not a dark storm. |
| `far.webp` | 46 KB | 1280×720 RGBA | Distant floating isles and waterfalls. Hard-edged studio clouds were removed; the sky plate already paints softer clouds. |
| `ground.webp` | 79 KB | 1280×720 RGBA | Three linked sloped grass islands, left high / right low. |
| `mid.webp` | 130 KB | 1280×720 RGBA | Wind-blown trees and shrubs on the slope. Suggested mid dy: **-40**. |

```
const MID_DY = { chase: -40 };
```

## Characters (`characters/`)

| File | State | Dimensions | Suggested height | vs Capy | Anchor |
| --- | --- | ---: | ---: | ---: | --- |
| `baby-capy-sleep.webp` | Hidden baby, curled asleep, facing right | 997×533 | 0.50 (body length ~0.93 at this scale) | 0.30 | Bottom (lying on the ground) |
| `baby-capy-happy.webp` | Hidden baby, sitting, arms raised | 776×912 | 0.85 | 0.51 | Bottom (sitting contact) |
| `capy-glide.webp` | Temporary glide / leap pose, facing right, small feather ruff and feathered tail | 1033×804 | 1.68 (same bounding height as idle; the pose is longer, so the head is a little smaller than `capy-idle` if you use that) | 1.00 | Mid-body / belly (airborne, not the feet) |
| `lumi-idle.webp` | Lumi the golden firefly, idle / watch | 647×644 | 0.42 | 0.25 | Center (flying) |
| `lumi-sparkle.webp` | Lumi sparkle / “étincelle” frame | 769×776 | 0.42 for the body (the sprite is taller because of the sparks; don’t let the sparkles change her size) | 0.25 | Center (flying) |

## Props (`props/`)

| File | Replaces / use | State | Dimensions | Suggested height | vs Capy | Anchor |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `mushroom-idle.webp` | Bounce mushroom, extended | Idle | 812×910 | 1.10 | 0.65 | Bottom of the stem |
| `mushroom-squashed.webp` | Same mushroom when Capy lands on it | Squashed, wider cap, shorter stem | 887×667 | 0.80 (keep the same ground point and cap-center X as idle) | 0.48 | Bottom of the stem |
| `lantern-unlit.webp` | Checkpoint lantern, cold | Unlit, empty glass | 201×877 | 2.00 (post foot to wooden cap) | 1.19 | Bottom of the post |
| `lantern-lit.webp` | Same checkpoint, lit | Flame and a soft gold glow | 248×890 | Scale so the **wooden post** matches unlit at 2.00 (the glow adds padding) | 1.19 | Bottom of the post |
| `pumpkin-herd-small.webp` | Chase herd, small | Worried face | 933×911 | 0.50 | 0.30 | Bottom (rolling) |
| `pumpkin-herd-medium.webp` | Chase herd, medium | Angry face | 945×930 | 0.75 | 0.45 | Bottom (rolling) |
| `pumpkin-herd-large.webp` | Chase herd, large | Furious, puffed cheeks | 967×925 | 1.05 | 0.63 | Bottom (rolling) |
| `shelf-platform.webp` | Pantry shelf Capy can walk on | One pose, wall brackets | 1233×513 | Width **2.40**; visual height ~0.55 including brackets | width 1.43 | Walkable top surface; brackets hang below |
| `hatch-closed.webp` | Pantry floor hatch, shut | Closed lid, 3/4 view | 967×660 | Frame width **1.60** | width 0.95 | Floor frame (share this with the open state) |
| `hatch-open.webp` | Same hatch, opened by Lumi | Lid up, dark shaft, see-through gap under the lid | 979×928 | Same frame width 1.60 (the lid makes the sprite taller) | width 0.95 | Same floor frame as closed |
| `glide-feather.webp` | Temporary glide pickup in the chase | One pose, pale gold feather | 614×1098 | 0.70 | 0.42 | Center (bobbing pickup) |

## Notes

- Scale the two lanterns by the wooden post, not the full sprite box, so the glow on the lit one does not shrink the post.
- Scale the two Lumi frames by the body, not the sparkles.
- `capy-glide` is a leaping side pose with a small shoulder ruff, not a parachute-tail glide. Anchor mid-body because the feet are off the ground.
- `hatch-closed` reads a little like a shallow chest; `hatch-open` is clearly a floor trapdoor. Keep the frame width and floor anchor identical so they swap in place.
- The pumpkin herd (cute faces) is separate from the earlier `pumpkin-normal` / `pumpkin-trapped` props.

## Totals

- 20 WebP files
- 1.38 MiB
