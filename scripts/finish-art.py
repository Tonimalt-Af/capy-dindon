#!/usr/bin/env python3
"""Finish the painted WebPs: defringe cutouts, repair the parade arch,
match prop-grass to the island, and warm the Éveil sun.

Run once on the source art. A second full run is refused unless --force,
because the grass grade and the sun grade are not idempotent.
--touchup is the one-time follow-up (lawn tint, parade grain, sun core).

  python3 scripts/finish-art.py
  python3 scripts/finish-art.py --touchup
  python3 scripts/finish-art.py --root public/assets/art --force
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

STAMP = "finish-art-1"
TOUCHUP = "finish-art-2"
SUN = "finish-art-3"
ART_W = 1280
ART_H = 720

SCENES = (
    "camp-des-nuages",
    "iles-aux-glands",
    "garde-manger",
    "parade",
    "eveil",
)
LAYERS = ("sky", "far", "ground", "mid")
# Positive dy moves the mid layer down. Grass pads that should meet the island
# sit this many source pixels below the ground's grass row.
MID_DY = {
    "camp-des-nuages": -220,
    "iles-aux-glands": -220,
    "garde-manger": 0,
    "parade": -170,
    "eveil": -200,
}
GRASS_ROW = {
    "camp-des-nuages": 0.46,
    "iles-aux-glands": 0.51,
    "garde-manger": 0.925,
    "parade": 0.50,
    "eveil": 0.45,
}


def load(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def save(path: Path, arr: np.ndarray) -> None:
    image = Image.fromarray(arr.astype(np.uint8), "RGBA")
    image.save(path, "WEBP", quality=90, method=6, exact=True)


def shift(src: np.ndarray, dy: int, dx: int) -> np.ndarray:
    out = np.roll(np.roll(src, dy, 0), dx, 1)
    if dy > 0:
        out[:dy] = 0
    elif dy < 0:
        out[dy:] = 0
    if dx > 0:
        out[:, :dx] = 0
    elif dx < 0:
        out[:, dx:] = 0
    return out


def bleed(rgb: np.ndarray, alpha: np.ndarray, passes: int) -> np.ndarray:
    """Copy opaque color outward so filtered edges are not black or white."""
    color = rgb.astype(np.float32)
    solid = alpha > 235
    weight = solid.astype(np.float32)
    carried = color * weight[:, :, None]
    neigh = ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1))
    for _ in range(passes):
        acc_c = np.zeros_like(carried)
        acc_w = np.zeros_like(weight)
        for dy, dx in neigh:
            acc_c += shift(carried, dy, dx)
            acc_w += shift(weight, dy, dx)
        fill = (weight < 0.5) & (acc_w > 0)
        carried[fill] = acc_c[fill] / acc_w[fill, None]
        weight[fill] = 1
    edge = alpha < 250
    out = color.copy()
    out[edge] = carried[edge]
    return np.clip(out, 0, 255)


def erode_partial(alpha: np.ndarray) -> np.ndarray:
    """Eat the semi-transparent halo without shrinking solid shapes."""
    neigh = np.stack(
        [shift(alpha, dy, dx) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))],
        axis=0,
    ).min(axis=0)
    out = alpha.copy()
    partial = alpha < 242
    out[partial] = np.minimum(alpha[partial], neigh[partial])
    return out


def defringe(arr: np.ndarray, passes: int, erode: bool) -> np.ndarray:
    rgb = bleed(arr[:, :, :3], arr[:, :, 3], passes)
    alpha = erode_partial(arr[:, :, 3]) if erode else arr[:, :, 3]
    out = np.dstack([rgb, alpha.astype(np.float32)]).astype(np.uint8)
    return out


def grass_mask(arr: np.ndarray, y0: int, y1: int) -> np.ndarray:
    """Green blades and the yellow-green lawn. The first mask missed the lawn,
    which is yellow enough that green is not the dominant channel."""
    band = arr[y0:y1]
    r = band[:, :, 0].astype(np.int16)
    g = band[:, :, 1].astype(np.int16)
    b = band[:, :, 2].astype(np.int16)
    a = band[:, :, 3]
    yellow = (r > 70) & (r < 195) & (g > 60) & (g < 190) & (b < 100) & (r < g + 40) & (g + 22 > r) & (r > b + 28) & (g > b + 18)
    green = (g > 50) & (g < 180) & (g > r + 6) & (g > b + 12) & (r < 150) & (b < 90)
    return (a > 180) & (yellow | green)


def mean_rgb(arr: np.ndarray, mask: np.ndarray) -> np.ndarray | None:
    if int(mask.sum()) < 40:
        return None
    return arr[mask][:, :3].astype(np.float32).mean(axis=0)


def match_grass(mid: np.ndarray, ground: np.ndarray, scene: str) -> np.ndarray:
    if scene == "garde-manger":
        return mid
    grow = int(GRASS_ROW[scene] * ART_H)
    # Mid is shifted up by -dy when dy is negative, so its contact band is lower.
    mrow = int(grow + (-MID_DY[scene]))
    gy0, gy1 = max(0, grow - 28), min(ART_H, grow + 36)
    my0, my1 = max(0, mrow - 70), min(ART_H, mrow + 55)
    gmask = grass_mask(ground, gy0, gy1)
    gmean = mean_rgb(ground[gy0:gy1], gmask)
    if gmean is None:
        return mid
    out = mid.copy()
    band = out[my0:my1]
    mask = grass_mask(out, my0, my1)
    mmean = mean_rgb(band, mask)
    if mmean is None:
        return mid
    scale = gmean / np.maximum(mmean, 1)
    scale = 1 + (scale - 1) * 0.8
    scale = np.clip(scale, 0.72, 1.45)
    colored = band[:, :, :3].astype(np.float32) * scale
    band[:, :, :3][mask] = np.clip(colored[mask], 0, 255)
    out[my0:my1] = band
    return out


def repair_parade(arr: np.ndarray) -> np.ndarray:
    """Close the dark gap in the parade crossbeam and recolor the white brace wedges."""
    out = arr.copy()
    source = out[316, :, :3].astype(np.float32)
    for y in range(327, 347):
        shade = 1 - (y - 327) * 0.011
        row = source * shade
        healthy = (
            (out[y, :, 3] > 220)
            & (out[y, :, 0] > 90)
            & (out[y, :, 0] > out[y, :, 2] + 10)
            & (out[y, :, 1] < 190)
        )
        paint = np.zeros(out.shape[1], dtype=bool)
        paint[568:712] = True
        paint &= ~healthy
        out[y, paint, :3] = np.clip(row[paint], 0, 255)
        out[y, paint, 3] = 255
    white = (out[:, :, 3] > 180) & (out[:, :, 0] > 220) & (out[:, :, 1] > 220) & (out[:, :, 2] > 210)
    ys, xs = np.where(white)
    keep = (ys > 340) & (ys < 390) & (xs > 480) & (xs < 830)
    for y, x in zip(ys[keep].tolist(), xs[keep].tolist()):
        found = None
        for dy in range(0, 42):
            yy = y + dy
            if yy >= ART_H:
                break
            for dx in (0, -2, 2, -5, 5, -9, 9):
                xx = x + dx
                if xx < 0 or xx >= ART_W:
                    continue
                r, g, b, a = (int(v) for v in out[yy, xx])
                if a > 200 and r > 80 and r > b + 8 and g < 175 and not (r > 220 and g > 220):
                    found = (r, g, b)
                    break
            if found:
                break
        if found:
            scale = 0.82 if sum(found) / 3 > 165 else 1
            out[y, x, :3] = [min(255, int(c * scale)) for c in found]
            out[y, x, 3] = 255
    return grain_parade_beam(out)


def grain_parade_beam(arr: np.ndarray) -> np.ndarray:
    """Put the crossbeam's own grain and shading back over the flat repair patch."""
    out = arr.copy()
    x0, x1 = 568, 712
    y0, y1 = 327, 347
    width = x1 - x0
    ramp = np.linspace(0, 1, width, dtype=np.float32)[:, None]
    for y in range(y0, y1):
        left = out[y, 500:560, :3].astype(np.float32)
        right = out[y, 720:780, :3].astype(np.float32)
        dev = left - left.mean(axis=0, keepdims=True)
        tiled = np.tile(dev, (int(np.ceil(width / max(dev.shape[0], 1))), 1))[:width]
        target = left.mean(axis=0) * (1 - ramp) + right.mean(axis=0) * ramp
        out[y, x0:x1, :3] = np.clip(target + tiled * 0.85, 0, 255)
    return out


def settle_sun(arr: np.ndarray) -> np.ndarray:
    """Knock the last near-white pixels in the sun disc down to warm gold."""
    rgb = arr[:, :, :3].astype(np.float32)
    h, w = rgb.shape[:2]
    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    disc = np.exp(-(((xs - 430) / 90) ** 2 + ((ys - 118) / 64) ** 2))
    white = rgb.min(axis=2)
    hot = np.clip((white - 150) / 70, 0, 1) * disc
    gold = np.array([252.0, 198.0, 96.0], dtype=np.float32)
    mix = hot[:, :, None] * 0.8
    out = arr.copy()
    out[:, :, :3] = np.clip(rgb * (1 - mix) + gold * mix, 0, 255).astype(np.uint8)
    return out


def warm_sun_core(arr: np.ndarray) -> np.ndarray:
    """The remaining pale core still reads as white. Pull only that core to gold."""
    rgb = arr[:, :, :3].astype(np.float32)
    h, w = rgb.shape[:2]
    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    disc = np.exp(-(((xs - 430) / 110) ** 2 + ((ys - 118) / 72) ** 2))
    lum = rgb.mean(axis=2)
    hot = np.clip((lum - 198) / 36, 0, 1) * disc
    gold = np.array([255.0, 186.0, 78.0], dtype=np.float32)
    mix = hot[:, :, None] * 0.62
    out = arr.copy()
    out[:, :, :3] = np.clip(rgb * (1 - mix) + gold * mix, 0, 255).astype(np.uint8)
    return settle_sun(out)


def tone_sun(arr: np.ndarray) -> np.ndarray:
    """Pull the pale sun core toward warm gold so it does not clip to white."""
    rgb = arr[:, :, :3].astype(np.float32)
    h, w = rgb.shape[:2]
    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    disc = np.exp(-(((xs - 430) / 168) ** 2 + ((ys - 118) / 102) ** 2))
    lum = rgb.mean(axis=2)
    hot = np.clip((lum - 188) / 52, 0, 1) * disc
    gold = np.array([255.0, 186.0, 78.0], dtype=np.float32)
    mixed = rgb * (1 - hot[:, :, None] * 0.78) + gold * (hot[:, :, None] * 0.78)
    # Keep a little of the original highlight, but never a near-white core.
    peak = np.clip((lum - 228) / 24, 0, 1) * disc
    mixed = mixed * (1 - peak[:, :, None] * 0.35) + gold * (peak[:, :, None] * 0.35)
    out = arr.copy()
    out[:, :, :3] = np.clip(mixed, 0, 255).astype(np.uint8)
    return warm_sun_core(out)


def content_bounds(arr: np.ndarray, pad: int = 8) -> dict[str, int]:
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0:
        return {"x0": 0, "y0": 0, "x1": ART_W, "y1": ART_H}
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(ART_W, int(xs.max()) + 1 + pad)
    y1 = min(ART_H, int(ys.max()) + 1 + pad)
    return {"x0": x0, "y0": y0, "x1": x1, "y1": y1}


def process_tree(root: Path) -> dict[str, dict[str, dict[str, int]]]:
    bounds: dict[str, dict[str, dict[str, int]]] = {}
    for scene in SCENES:
        folder = root / "scenes" / scene
        ground = load(folder / "ground.webp")
        for layer in LAYERS:
            path = folder / f"{layer}.webp"
            arr = ground if layer == "ground" else load(path)
            if layer == "sky":
                if scene == "eveil":
                    arr = tone_sun(arr)
            else:
                arr = defringe(arr, passes=4, erode=True)
                if layer == "mid" and scene == "parade":
                    arr = repair_parade(arr)
                if layer == "mid":
                    arr = match_grass(arr, ground, scene)
            save(path, arr)
            if layer != "sky":
                bounds.setdefault(scene, {})[layer] = content_bounds(arr)
            print(f"finished {scene}/{layer}")
        # Ground was read before its own defringe; reload the saved file for the grass match source.
        # match_grass compares against the original ground colors, which is what we want.
    char_dir = root / "characters"
    if char_dir.exists():
        for path in sorted(char_dir.glob("*.webp")):
            save(path, defringe(load(path), passes=3, erode=False))
            print(f"finished characters/{path.name}")
    return bounds


def touchup(root: Path) -> None:
    """Second pass on art that already has finish-art-1: lawn tint, beam grain, sun core.
    Does not defringe again."""
    for scene in SCENES:
        if scene == "garde-manger":
            continue
        folder = root / "scenes" / scene
        ground = load(folder / "ground.webp")
        mid_path = folder / "mid.webp"
        save(mid_path, match_grass(load(mid_path), ground, scene))
        print(f"retinted {scene}/mid")
    parade = root / "scenes" / "parade" / "mid.webp"
    save(parade, grain_parade_beam(load(parade)))
    print("grained parade/mid")
    sky = root / "scenes" / "eveil" / "sky.webp"
    save(sky, warm_sun_core(load(sky)))
    print("warmed eveil/sky")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="public/assets/art")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--touchup", action="store_true", help="Lawn, parade grain, and sun core on a finish-art-1 tree")
    parser.add_argument("--sun", action="store_true", help="Pull the remaining pale Éveil core to gold")
    args = parser.parse_args()
    root = Path(args.root)
    stamp_path = root / "finish.json"
    if args.sun:
        if not stamp_path.exists():
            raise SystemExit("No finish.json. Run the full finish first.")
        stamp = json.loads(stamp_path.read_text())
        if stamp.get("version") == SUN:
            print("sun already settled")
            return
        if stamp.get("version") != TOUCHUP:
            raise SystemExit(f"Refusing sun settle on stamp {stamp.get('version')}.")
        sky = root / "scenes" / "eveil" / "sky.webp"
        save(sky, settle_sun(load(sky)))
        stamp["version"] = SUN
        stamp_path.write_text(json.dumps(stamp, indent=2) + "\n")
        print("settled eveil/sky")
        return
    if args.touchup:
        if not stamp_path.exists():
            raise SystemExit("No finish.json. Run the full finish first.")
        stamp = json.loads(stamp_path.read_text())
        if stamp.get("version") == TOUCHUP:
            print("touchup already applied")
            return
        if stamp.get("version") != STAMP:
            raise SystemExit(f"Refusing touchup on stamp {stamp.get('version')}.")
        touchup(root)
        stamp["version"] = TOUCHUP
        stamp_path.write_text(json.dumps(stamp, indent=2) + "\n")
        return
    if stamp_path.exists() and not args.force:
        raise SystemExit(f"{stamp_path} exists. Pass --force to finish the art again.")
    bounds = process_tree(root)
    stamp_path.write_text(json.dumps({"version": TOUCHUP, "bounds": bounds}, indent=2) + "\n")
    print(json.dumps(bounds, indent=2))


if __name__ == "__main__":
    main()
