# CapyDindon painted 2D art

Painted character sprites and 2.5D scene layers (sky / far / mid / ground).
Files are lossy WebP at quality 90, with alpha preserved on every transparent layer.
Sky layers are opaque; far, mid, and ground are RGBA.
All scene layers are 1280×720 and are **not** pre-shifted — apply the mid `dy` at composite time.

## Characters

| File | Size | Dimensions | Notes |
| --- | ---: | --- | --- |
| `characters/capy-idle.webp` | 80 KB | 834×690 RGBA | Idle, facing right |
| `characters/capy-walk-1.webp` | 78 KB | 859×683 RGBA | Walk frame 1, reaching near-front stride, facing right |
| `characters/capy-walk-2.webp` | 58 KB | 706×683 RGBA | Walk frame 2, gathered / opposite gait, facing right; same height/baseline as walk-1 |
| `characters/capy-jump.webp` | 60 KB | 685×723 RGBA | Jump, facing right |
| `characters/capy-joy.webp` | 73 KB | 752×807 RGBA | Joy / celebration |
| `characters/capy-sleep.webp` | 62 KB | 926×420 RGBA | Sleep, profile, head to the right |
| `characters/capyplume.webp` | 100 KB | 926×700 RGBA | Capyplume form |
| `characters/capydindon.webp` | 202 KB | 928×779 RGBA | Legendary CapyDindon form |

## Scenes

Composite order: `sky`, then `far`, then `ground`, then `mid` shifted by `dy` (positive `dy` moves mid down).
Suggested mid offsets were chosen so prop grass pads sit on the island surface in a 1280×720 preview.

| Scene | Mid dy (px) | Files | Dimensions |
| --- | ---: | --- | --- |
| Camp des Nuages (`camp-des-nuages`) | -220 | `sky.webp` (62 KB), `far.webp` (85 KB), `mid.webp` (150 KB), `ground.webp` (118 KB) | 1280×720 |
| Îles aux glands (`iles-aux-glands`) | -220 | `sky.webp` (36 KB), `far.webp` (131 KB), `mid.webp` (146 KB), `ground.webp` (117 KB) | 1280×720 |
| Garde-manger (`garde-manger`) | 0 | `sky.webp` (132 KB), `far.webp` (111 KB), `mid.webp` (60 KB), `ground.webp` (48 KB) | 1280×720 |
| Parade (`parade`) | -170 | `sky.webp` (44 KB), `far.webp` (78 KB), `mid.webp` (74 KB), `ground.webp` (121 KB) | 1280×720 |
| Éveil (`eveil`) | -200 | `sky.webp` (122 KB), `far.webp` (118 KB), `mid.webp` (155 KB), `ground.webp` (140 KB) | 1280×720 |

### Mid dy values

```
const MID_DY = {
  "camp-des-nuages": -220,
  "iles-aux-glands": -220,
  "garde-manger": 0,
  "parade": -170,
  "eveil": -200,
};
```

## Finishing

`scripts/finish-art.py` defringes the cutouts, fills the parade arch, matches the prop grass to the island, and warms the Éveil sun. It is a one-shot step: `python3 scripts/finish-art.py` refuses to run twice unless `--force` is passed. `--touchup` and `--sun` are the later passes, and each refuses to run once its stamp is already in `finish.json`.

## Totals

- 28 WebP files
- 2.43 MiB after finishing (the source pack was 2.70 MiB)

