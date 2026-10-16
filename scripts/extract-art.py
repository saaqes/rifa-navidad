"""Recorta de la boleta oficial (public/brand/boleta.jpg) cada pieza gráfica con fondo transparente.

Uso:  python3 scripts/extract-art.py        (requiere opencv-python-headless y pillow)
Salida: public/brand/art/*.webp
"""
import sys
import cv2
import numpy as np
from PIL import Image

SRC = "public/brand/boleta.jpg"
OUT = "public/brand/art"

# nombre: (x0, y0, x1, y1, método, parámetros)
PIECES = {
    "plaque":   (250, 50, 770, 208, "grabcut", {"inset": 4}),
    # título + cinta NAVIDEÑA + cinta de premios (en la boleta se superponen, se recortan juntos)
    "hero":     (0, 205, 1024, 884, "grabcut", {"inset": 2}),
    "ball1":    (100, 785, 505, 1245, "grabcut", {"inset": 4}),
    "ball2":    (520, 785, 925, 1245, "grabcut", {"inset": 4}),
    "pill":     (145, 1250, 880, 1370, "grabcut", {"inset": 3}),
    # bolas de árbol sueltas (máscara circular: cx, cy, radio en coordenadas de la boleta)
    "bauble-red":   (0, 15, 112, 172, "circle", {"c": (55, 98), "r": 53}),
    "bauble-gold":  (928, 40, 1024, 215, "circle", {"c": (986, 138), "r": 58}),
    "bauble-gold2": (925, 1300, 1024, 1442, "circle", {"c": (978, 1368), "r": 52}),
    "bauble-red2":  (0, 1395, 112, 1525, "circle", {"c": (48, 1455), "r": 52}),
    "gift":     (0, 1085, 135, 1222, "grabcut", {"inset": 3}),
}
# esquinas con ramas, bolas, luces y regalos, con borde difuminado hacia el interior
CORNERS = {
    "corner-tl": (0, 0, 300, 300, "tl"),
    "corner-tr": (760, 0, 1024, 300, "tr"),
    "corner-bl": (0, 1085, 142, 1536, "bl"),
    "corner-br": (882, 1085, 1024, 1536, "br"),
}


def largest_component(mask):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if n <= 1:
        return mask
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return ((lab == keep) * 255).astype(np.uint8)


def fill_holes(mask):
    h, w = mask.shape
    pad = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    ff = pad.copy()
    cv2.floodFill(ff, np.zeros((h + 4, w + 4), np.uint8), (0, 0), 255)
    holes = cv2.bitwise_not(ff)[1:-1, 1:-1]
    return cv2.bitwise_or(mask, holes)


def make_mask(crop, method, p):
    h, w = crop.shape[:2]
    if method == "rrect":
        m = np.zeros((h * 4, w * 4), np.uint8)
        cv2.rectangle(m, (0, 0), (w * 4 - 1, h * 4 - 1), 255, -1)
        r = p["r"] * 4
        # esquinas redondeadas
        k = np.zeros_like(m)
        cv2.rectangle(k, (r, 0), (w * 4 - r, h * 4), 255, -1)
        cv2.rectangle(k, (0, r), (w * 4, h * 4 - r), 255, -1)
        for cx in (r, w * 4 - r):
            for cy in (r, h * 4 - r):
                cv2.circle(k, (cx, cy), r, 255, -1)
        return cv2.resize(k, (w, h), interpolation=cv2.INTER_AREA)
    if method == "circle":
        m = np.zeros((h * 4, w * 4), np.uint8)
        cx, cy = p["c"]
        cv2.circle(m, (int((cx - p["x0"]) * 4), int((cy - p["y0"]) * 4)), p["r"] * 4, 255, -1)
        return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA)
    ins = p["inset"]
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    mask[ins:h - ins, ins:w - ins] = cv2.GC_PR_FGD
    # el centro casi seguro es objeto
    cy, cx = h // 2, w // 2
    mask[cy - h // 6:cy + h // 6, cx - w // 6:cx + w // 6] = cv2.GC_FGD
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(crop, mask, None, bg, fg, 8, cv2.GC_INIT_WITH_MASK)
    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    m = largest_component(m)
    m = fill_holes(m)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    m = cv2.erode(m, np.ones((3, 3), np.uint8))
    return m


def main(only=None):
    img = cv2.imread(SRC)
    for name, (x0, y0, x1, y1, method, p) in PIECES.items():
        if only and name not in only:
            continue
        crop = img[y0:y1, x0:x1].copy()
        m = make_mask(crop, method, {**p, "x0": x0, "y0": y0})
        m = cv2.GaussianBlur(m, (0, 0), 1.1)  # borde suave
        rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2RGBA)
        rgba[:, :, 3] = m
        ys, xs = np.where(m > 8)
        if len(xs):
            rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(rgba).save(f"{OUT}/{name}.webp", quality=90, method=6)
        print(f"{name}: {rgba.shape[1]}x{rgba.shape[0]}")


def corners(only=None):
    img = cv2.imread(SRC)
    for name, (x0, y0, x1, y1, where) in CORNERS.items():
        if only and name not in only:
            continue
        crop = img[y0:y1, x0:x1]
        h, w = crop.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        # distancia normalizada hacia el interior de la página (0 en la esquina, 1 en el borde interior)
        dx = xx / (w - 1) if where in ("tl", "bl") else 1 - xx / (w - 1)
        dy = yy / (h - 1) if where in ("tl", "tr") else 1 - yy / (h - 1)
        d = np.sqrt(dx ** 2 + dy ** 2)
        alpha = np.clip((1.0 - d) / 0.35, 0, 1)  # opaco en la esquina, se desvanece al final
        alpha = alpha * alpha * (3 - 2 * alpha)
        if where in ("bl", "br"):  # el borde inferior de la boleta no debe cortarse en seco
            fade = np.clip((h - 1 - yy) / (h * 0.14), 0, 1)
            alpha = alpha * (fade * fade * (3 - 2 * fade))
        rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2RGBA)
        rgba[:, :, 3] = (alpha * 255).astype(np.uint8)
        Image.fromarray(rgba).save(f"{OUT}/{name}.webp", quality=88, method=6)
        print(f"{name}: {w}x{h}")


if __name__ == "__main__":
    main(sys.argv[1:] or None)
    corners(sys.argv[1:] or None)
