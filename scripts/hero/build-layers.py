"""Build the title screen's layers from one portrait photograph.

Inputs:  the photo, and a subject mask made by subject-mask.swift.
Outputs: public/photos/hero/
  ridge.webp        background with the subject removed and the sky cut to alpha
  subject.webp      the subject on a transparent ground
  ridge-map.webp    the background redrawn as contour lines
  subject-map.webp  the subject redrawn as contour lines
  full.webp         the untouched photo

Usage: python build-layers.py <photo> <mask.png> <out-dir>
Needs: opencv-python-headless, pillow, numpy
"""

import sys

import cv2
import numpy as np
from PIL import Image

photo_path, mask_path, out = sys.argv[1:4]
src = cv2.imread(photo_path)
H, W = src.shape[:2]
m8 = cv2.imread(mask_path, 0)
m = m8.astype(np.float32) / 255

# ── Clean plate ────────────────────────────────────────────────────────
# Two people stand at the right edge. Cover them with a mirrored strip
# from the left edge at the same height, blended with Poisson cloning.
y0, y1, x0, x1 = 880, 1470, 975, W
w = x1 - x0
patch = src[y0:y1, 0:w][:, ::-1].copy()
pm = np.zeros(patch.shape[:2], np.uint8)
pm[12:-12, 12:-1] = 255
padded = cv2.copyMakeBorder(src, 0, 0, 0, 40, cv2.BORDER_REFLECT)
padded = cv2.seamlessClone(patch, padded, pm, (x0 + w // 2, (y0 + y1) // 2), cv2.NORMAL_CLONE)
plate = padded[:, :W]

# Fill the hole the subject leaves. Only its rim is ever seen (the subject
# plane sits on top and moves a few pixels), so inpaint at full resolution
# and keep the texture sharp there.
hole = cv2.dilate((m8 > 40).astype(np.uint8) * 255, np.ones((27, 27), np.uint8))
plate = cv2.inpaint(plate, hole, 5, cv2.INPAINT_TELEA)

# ── Sky to alpha ───────────────────────────────────────────────────────
hsv = cv2.cvtColor(plate, cv2.COLOR_BGR2HSV).astype(np.float32)
hue, sat = hsv[..., 0], hsv[..., 1] / 255
sky = ((hue > 95) & (hue < 125) & (sat > 0.28)).astype(np.uint8) * 255
sky[H // 2 :, :] = 0
_, labels = cv2.connectedComponents(sky)
keep = np.zeros_like(sky)
for label in np.unique(labels[0, :]):
    if label != 0:
        keep[labels == label] = 255
keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
alpha = 255 - cv2.GaussianBlur(keep, (0, 0), 1.6)
ridge = cv2.cvtColor(plate, cv2.COLOR_BGR2RGBA)
ridge[..., 3] = alpha
Image.fromarray(ridge).save(f"{out}/ridge.webp", quality=84, method=6)

# ── Subject ────────────────────────────────────────────────────────────
a = np.clip((m - 0.35) / 0.5, 0, 1)
a = cv2.GaussianBlur((a * 255).astype(np.uint8), (0, 0), 0.8)
subject = cv2.cvtColor(src, cv2.COLOR_BGR2RGBA)
subject[..., 3] = a
Image.fromarray(subject).save(f"{out}/subject.webp", quality=86, method=6)
Image.fromarray(cv2.cvtColor(src, cv2.COLOR_BGR2RGB)).save(f"{out}/full.webp", quality=80, method=6)


# ── Contour versions ───────────────────────────────────────────────────
def contour_layer(lum, region, bands, color, strength, ss=2):
    """Isolines of blurred luminance, antialiased by supersampling."""
    L = cv2.GaussianBlur(lum, (0, 0), 7)
    L = cv2.resize(L, (W * ss, H * ss), interpolation=cv2.INTER_CUBIC)
    band = np.floor(L * bands)
    edge = np.zeros_like(L, np.float32)
    edge[:-1, :] += band[:-1, :] != band[1:, :]
    edge[:, :-1] += band[:, :-1] != band[:, 1:]
    edge = cv2.dilate(np.clip(edge, 0, 1), np.ones((2, 2), np.uint8))
    edge *= 0.55 + 0.45 * ((band % 4) == 0)  # every fourth line is an index contour
    edge = cv2.resize(edge, (W, H), interpolation=cv2.INTER_AREA)
    layer = np.zeros((H, W, 4), np.uint8)
    layer[..., 0], layer[..., 1], layer[..., 2] = color
    layer[..., 3] = np.clip(edge * strength * region, 0, 1) * 255
    return layer


RUNE = (95, 212, 230)
EMBER = (242, 163, 58)

gray = cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
land = alpha.astype(np.float32) / 255
ridge_map = contour_layer(gray, land, 22, RUNE, 0.85)
sky_rings = contour_layer(gray, 1 - land, 60, RUNE, 0.22)
ridge_map[..., 3] = np.maximum(ridge_map[..., 3], sky_rings[..., 3])
Image.fromarray(ridge_map).save(f"{out}/ridge-map.webp", quality=88, method=6)

sgray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
lines = contour_layer(sgray, (m > 0.5).astype(np.float32), 16, EMBER, 0.9)
body = (m > 0.5).astype(np.uint8) * 255
outline = cv2.morphologyEx(body, cv2.MORPH_GRADIENT, np.ones((5, 5), np.uint8))
outline = cv2.GaussianBlur(outline, (0, 0), 1.0).astype(np.float32) / 255
fill_a = cv2.GaussianBlur(body, (0, 0), 1.2).astype(np.float32)[..., None] / 255 * 0.94
line_a = np.maximum(lines[..., 3:4].astype(np.float32) / 255, outline[..., None])
rgb = np.array((10, 20, 34), np.float32) * (1 - line_a) + np.array(EMBER, np.float32) * line_a
subject_map = np.concatenate([rgb, np.maximum(fill_a, line_a) * 255], axis=2).astype(np.uint8)
Image.fromarray(subject_map).save(f"{out}/subject-map.webp", quality=88, method=6)
print("wrote layers to", out)
