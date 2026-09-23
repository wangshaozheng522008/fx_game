#!/usr/bin/env python3
"""Render pixel posters for 函数射线 / FX GAME."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT_WOFF2 = ROOT / "fonts" / "fusion-pixel-12px-proportional-zh_hans.otf.woff2"
FONT_TTF = Path("/tmp/fusion-pixel-12.ttf")
KEYART = ROOT / "keyart-base.jpg"
if not KEYART.exists():
    KEYART = Path("/opt/cursor/artifacts/assets/fx-game-poster-notitle.png")

LW, LH = 270, 360
SCALE = 4

PALETTE = {
    ".": None,
    "k": (0x2A, 0x10, 0x30),
    "w": (0x5A, 0x30, 0x18),
    "s": (0xF0, 0xC0, 0x90),
    "r": (0x3D, 0x8C, 0xFF),
    "b": (0x7C, 0xE7, 0xFF),
    "g": (0xFF, 0xE5, 0x66),
    "e": (0xFF, 0xF5, 0x6B),
    "d": (0xFF, 0x2D, 0x55),
    "h": (0xFF, 0x7A, 0x90),
    "n": (0xF4, 0xE8, 0xC8),
    "y": (0xFF, 0xF1, 0xA8),
    "o": (0xFF, 0xB3, 0x47),
}

PLAYER = [
    ".......gg......",
    "......gggg.....",
    ".....kkkkkk....",
    ".....kssssk....",
    "....kksssskk...",
    ".....kssssk....",
    ".....k.ss.k....",
    "...ggrrrrrrgg..",
    "..gggrrrrrrggg.",
    "...ggrrrrrrgg..",
    "....rrrrrrrr...",
    "....rr....rr...",
    "....rr....rr...",
    "....ww....ww...",
    "...............",
]

MONSTER = [
    "...............",
    "......kkkk.....",
    "....kkddddkk...",
    "...kddhhhhddk..",
    "..kddhooohhddk.",
    "..kdhyhyhyhddk.",
    "..kdhhkkkkhhdk.",
    "..kddhhhhhhddk.",
    "..kddhheehhddk.",
    "..kkddhhhhddkk.",
    "...kkddddddkk..",
    "....kkkkkkkk...",
    ".....k....k....",
    "...............",
]

HEART = [
    ".d.d.",
    "ddddd",
    "ddddd",
    ".ddd.",
    "..d..",
]

BG = (0x14, 0x0C, 0x22)
INK = (0xF4, 0xE8, 0xC8)
MUTED = (0xA8, 0x98, 0x78)
ACCENT = (0x7C, 0xFF, 0x6B)
CYAN = (0x7C, 0xE7, 0xFF)
YELLOW = (0xFF, 0xE5, 0x66)
SHADOW = (0x0A, 0x06, 0x12)
PANEL = (0x1C, 0x12, 0x30)
BTN = (0x3D, 0x2A, 0x6B)
BTN_HI = (0x5A, 0x3D, 0x8A)
STAGE = (0x1A, 0x10, 0x28)
GRID = (0x2D, 0x1B, 0x4A)
AXIS = (0xC8, 0xB4, 0x8A)
AXIS_DIM = (0x8C, 0x7A, 0x5A)
SCAN = (0x10, 0x09, 0x1C)


def ensure_ttf() -> Path:
    if FONT_TTF.exists():
        return FONT_TTF
    from fontTools.ttLib import TTFont

    font = TTFont(str(FONT_WOFF2))
    font.flavor = None
    font.save(str(FONT_TTF))
    return FONT_TTF


def pixel_font() -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ensure_ttf()), 12)


def render_text(text: str, fill, outline=None, shadow=False) -> Image.Image:
    font = pixel_font()
    probe = Image.new("L", (1, 1))
    draw = ImageDraw.Draw(probe)
    draw.fontmode = "1"
    bbox = draw.textbbox((0, 0), text, font=font)
    w = max(1, bbox[2] - bbox[0])
    h = max(1, bbox[3] - bbox[1])
    pad = 2 if (outline or shadow) else 1
    img = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    dr.fontmode = "1"
    ox, oy = pad - bbox[0], pad - bbox[1]
    if shadow:
        dr.text((ox + 1, oy + 1), text, font=font, fill=SHADOW + (255,))
    if outline:
        oc = outline + ((255,) if len(outline) == 3 else ())
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx or dy:
                    dr.text((ox + dx, oy + dy), text, font=font, fill=oc)
    fc = fill + ((255,) if len(fill) == 3 else ())
    dr.text((ox, oy), text, font=font, fill=fc)
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255 if a >= 96 else 0)
    return img


def scale_nn(img: Image.Image, k: int) -> Image.Image:
    return img.resize((img.width * k, img.height * k), Image.Resampling.NEAREST)


class Pix:
    def __init__(self, w: int, h: int, color=BG) -> None:
        self.img = Image.new("RGB", (w, h), color)
        self.px = self.img.load()
        self.w = w
        self.h = h

    def fill(self, x, y, w, h, color) -> None:
        x0 = max(0, int(x))
        y0 = max(0, int(y))
        x1 = min(self.w, int(x + w))
        y1 = min(self.h, int(y + h))
        p = self.px
        for yy in range(y0, y1):
            for xx in range(x0, x1):
                p[xx, yy] = color

    def pset(self, x, y, color) -> None:
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = color

    def sprite(self, mapping, px, py, scale=2) -> None:
        cols = len(mapping[0])
        for row, line in enumerate(mapping):
            for col, ch in enumerate(line):
                color = PALETTE[ch]
                if not color:
                    continue
                self.fill(px + col * scale, py + row * scale, scale, scale, color)

    def blit(self, src: Image.Image, x, y) -> None:
        if src.mode != "RGBA":
            src = src.convert("RGBA")
        self.img.paste(src, (int(x), int(y)), src)

    def text(self, s, x, y, color, k=1, outline=None, shadow=False) -> tuple[int, int]:
        t = render_text(s, color, outline, shadow)
        if k != 1:
            t = scale_nn(t, k)
        self.blit(t, x, y)
        return t.size

    def center(self, s, y, color, k=1, outline=None, shadow=False) -> tuple[int, int]:
        t = render_text(s, color, outline, shadow)
        if k != 1:
            t = scale_nn(t, k)
        self.blit(t, (self.w - t.width) // 2, y)
        return t.size


def world_to_pix(stage, x, y, rng):
    return (
        stage["x"] + ((x / rng + 1) / 2) * stage["w"],
        stage["y"] + (1 - (y / rng + 1) / 2) * stage["h"],
    )


def draw_game_poster() -> Image.Image:
    g = Pix(LW, LH, BG)
    # scanlines
    for y in range(0, LH, 2):
        g.fill(0, y, LW, 1, SCAN)

    g.fill(2, 2, LW - 4, LH - 4, BTN)
    g.fill(4, 4, LW - 8, LH - 8, PANEL)
    g.fill(6, 6, LW - 12, LH - 12, BG)
    for y in range(6, LH - 6, 2):
        g.fill(6, y, LW - 12, 1, SCAN)
    g.fill(6, 6, LW - 12, 2, BTN_HI)
    g.fill(6, 6, 2, LH - 12, BTN_HI)
    g.fill(LW - 8, 6, 2, LH - 12, SHADOW)
    g.fill(6, LH - 8, LW - 12, 2, SHADOW)

    g.fill(8, 8, 3, 3, ACCENT)
    g.fill(11, 8, 3, 3, YELLOW)
    g.fill(LW - 14, 8, 3, 3, YELLOW)
    g.fill(LW - 11, 8, 3, 3, ACCENT)
    g.fill(8, LH - 14, 3, 3, (0xFF, 0x3B, 0x5C))
    g.fill(LW - 14, LH - 14, 3, 3, (0x3D, 0x8C, 0xFF))

    g.center("PIXEL MATH ARENA", 12, ACCENT, 1)
    g.center("函数射线", 24, INK, 3, outline=SHADOW, shadow=True)
    g.center("FX GAME", 76, CYAN, 1)
    g.center("选对等值线，沿曲线出击", 92, MUTED, 1)

    stage = {"x": 14, "y": 108, "w": 242, "h": 130}
    g.fill(stage["x"] - 2, stage["y"] - 2, stage["w"] + 4, stage["h"] + 4, SHADOW)
    g.fill(stage["x"], stage["y"], stage["w"], stage["h"], STAGE)
    for y in range(stage["y"], stage["y"] + stage["h"], 2):
        g.fill(stage["x"], y, stage["w"], 1, (0x22, 0x15, 0x36))

    rng = 7.0
    for u in range(-6, 7):
        vx, _ = world_to_pix(stage, u, 0, rng)
        _, hy = world_to_pix(stage, 0, u, rng)
        g.fill(round(vx), stage["y"], 1, stage["h"], GRID)
        g.fill(stage["x"], round(hy), stage["w"], 1, GRID)

    ox, oy = world_to_pix(stage, 0, 0, rng)
    g.fill(stage["x"], round(oy), stage["w"], 2, AXIS)
    g.fill(round(ox), stage["y"], 2, stage["h"], AXIS)
    g.text("x", stage["x"] + stage["w"] - 12, round(oy) + 3, AXIS_DIM, 1)
    g.text("y", round(ox) + 4, stage["y"] + 3, AXIS_DIM, 1)

    radius = 4.05
    for i in range(0, 241):
        t = (i / 240) * math.pi * 2
        px, py = world_to_pix(stage, radius * math.cos(t), radius * math.sin(t), rng)
        color = CYAN if i % 7 == 0 else YELLOW
        g.fill(round(px) - 1, round(py) - 1, 2, 2, color)

    pang = math.pi * 1.12
    player = (radius * math.cos(pang), radius * math.sin(pang))
    monsters = [
        (radius * math.cos(a), radius * math.sin(a))
        for a in (0.20, 0.78, 1.42)
    ]
    ppx, ppy = world_to_pix(stage, *player, rng)
    g.sprite(PLAYER, round(ppx) - 22, round(ppy) - 24, 3)
    for mx, my in monsters:
        mpx, mpy = world_to_pix(stage, mx, my, rng)
        g.sprite(MONSTER, round(mpx) - 22, round(mpy) - 24, 3)
        for k in range(6):
            g.fill(
                round(mpx) + ((k * 5) % 7 - 3) * 2,
                round(mpy) + ((k * 3) % 7 - 3) * 2 - 12,
                2,
                2,
                YELLOW,
            )

    label = render_text("x²+y²", YELLOW)
    g.fill(stage["x"] + 6, stage["y"] + 6, label.width + 8, label.height + 4, SHADOW)
    g.blit(label, stage["x"] + 10, stage["y"] + 8)

    pills = [("ax+by", 14), ("sin(xy)", 92), ("r*theta", 176)]
    for text, x in pills:
        w = 72 if x != 176 else 80
        g.fill(x, 244, w, 16, BTN)
        g.fill(x, 244, w, 1, BTN_HI)
        g.text(text, x + 8, 246, INK, 1)

    diffs = [
        ("入门", "欧几里得级", (0x3D, 0xBF, 0x6A), 14, 266),
        ("进阶", "阿基米德级", (0x3D, 0x8C, 0xFF), 140, 266),
        ("困难", "高斯级", (0x8B, 0x5C, 0xF6), 14, 296),
        ("极限", "黎曼级", (0xFF, 0x4D, 0x4D), 140, 296),
    ]
    for tier, name, color, x, y in diffs:
        g.fill(x, y, 116, 26, PANEL)
        g.fill(x, y, 4, 26, color)
        g.fill(x + 4, y, 112, 1, BTN_HI)
        g.text(tier, x + 10, y + 2, color, 1)
        g.text(name, x + 10, y + 13, INK, 1)

    footer = "3命  容差5%  全中得分"
    ft = render_text(footer, MUTED)
    heart_w = 5 * 2
    hearts_w = heart_w * 3 + 6 * 2
    total = hearts_w + 10 + ft.width
    hx = (LW - total) // 2
    for _ in range(3):
        g.sprite(HEART, hx, 330, 2)
        hx += heart_w + 6
    g.blit(ft, hx + 4, 332)

    return scale_nn(g.img, SCALE)


def apply_scanlines(img: Image.Image, period: int = 2) -> Image.Image:
    out = img.copy()
    px = out.load()
    for y in range(1, out.height, period):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            px[x, y] = (int(r * 0.84), int(g * 0.84), int(b * 0.84), a)
    return out


def draw_keyart_poster() -> Image.Image:
    base = Image.open(KEYART).convert("RGBA")
    title = render_text("函数射线", INK, outline=SHADOW, shadow=True)
    title = apply_scanlines(scale_nn(title, 9))
    x = (base.width - title.width) // 2
    y = 88
    base.alpha_composite(title, (x, y))
    return base.convert("RGB").resize((1080, 1440), Image.Resampling.NEAREST)


def main() -> None:
    game = draw_game_poster()
    game.save(ROOT / "poster.png", "PNG", optimize=True)
    print("wrote", ROOT / "poster.png", game.size)

    if KEYART.exists():
        key = draw_keyart_poster()
        key.save(ROOT / "poster-keyart.png", "PNG", optimize=True)
        print("wrote", ROOT / "poster-keyart.png", key.size)


if __name__ == "__main__":
    main()
