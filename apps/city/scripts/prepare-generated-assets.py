from __future__ import annotations

import argparse
import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


CITY_SIZE = (1280, 720)
FACILITY_FRAME = (256, 192)
CHARACTER_FRAME = (128, 128)


def remove_connected_light_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    queue: deque[tuple[int, int]] = deque()
    seen = bytearray(width * height)

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return min(red, green, blue) >= 208 and max(red, green, blue) - min(red, green, blue) <= 28

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if not seen[index] and is_background(x, y):
            seen[index] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (*pixels[x, y][:3], 0)
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)
    return rgba


def fit_transparent(image: Image.Image, size: tuple[int, int], padding: int, bottom_align: bool = False) -> Image.Image:
    alpha_box = image.getchannel("A").getbbox()
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    if not alpha_box:
        return canvas
    subject = image.crop(alpha_box)
    max_width = size[0] - padding * 2
    max_height = size[1] - padding * 2
    scale = min(max_width / subject.width, max_height / subject.height)
    rendered = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
    x = (size[0] - rendered.width) // 2
    y = size[1] - padding - rendered.height if bottom_align else (size[1] - rendered.height) // 2
    canvas.alpha_composite(rendered, (x, y))
    return canvas


def keep_character_subject(image: Image.Image) -> Image.Image:
    rgba = image.copy()
    alpha = rgba.getchannel("A")
    width, height = rgba.size
    alpha_pixels = alpha.load()
    seen = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if seen[start_index] or alpha_pixels[start_x, start_y] == 0:
                continue
            seen[start_index] = 1
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    index = ny * width + nx
                    if seen[index] or alpha_pixels[nx, ny] == 0:
                        continue
                    seen[index] = 1
                    queue.append((nx, ny))
            components.append(component)

    if not components:
        return rgba
    subject = max(components, key=len)
    left = min(x for x, _ in subject) - 8
    right = max(x for x, _ in subject) + 8
    top = min(y for _, y in subject) - 8
    bottom = max(y for _, y in subject) + 12
    keep = {(x, y) for component in components if len(component) >= 6 for x, y in component if left <= x <= right and top <= y <= bottom}
    cleaned_alpha = Image.new("L", rgba.size, 0)
    cleaned_pixels = cleaned_alpha.load()
    for x, y in keep:
        cleaned_pixels[x, y] = alpha_pixels[x, y]
    rgba.putalpha(cleaned_alpha)
    return rgba


def keep_largest_component(image: Image.Image) -> Image.Image:
    rgba = image.copy()
    alpha = rgba.getchannel("A")
    width, height = rgba.size
    alpha_pixels = alpha.load()
    seen = bytearray(width * height)
    largest: list[tuple[int, int]] = []
    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if seen[start_index] or alpha_pixels[start_x, start_y] == 0:
                continue
            seen[start_index] = 1
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    index = ny * width + nx
                    if seen[index] or alpha_pixels[nx, ny] == 0:
                        continue
                    seen[index] = 1
                    queue.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    cleaned_alpha = Image.new("L", rgba.size, 0)
    cleaned_pixels = cleaned_alpha.load()
    for x, y in largest:
        cleaned_pixels[x, y] = alpha_pixels[x, y]
    rgba.putalpha(cleaned_alpha)
    return rgba


def prepare_city_background(source: Image.Image, output: Path) -> None:
    courtyard = source.crop((0, 0, 702, 544)).resize(CITY_SIZE, Image.Resampling.LANCZOS)
    courtyard = ImageEnhance.Sharpness(courtyard).enhance(1.18)
    courtyard.save(output, optimize=True)


def prepare_facility_atlas(source: Image.Image, output: Path) -> None:
    sheet = source.crop((710, 0, 1398, 542))
    crops = {
        "bulletin": (20, 12, 265, 205),
        "leaderboard": (276, 12, 495, 205),
        "garden": (496, 10, 688, 205),
        "dev-table": (6, 342, 169, 500),
        "social-table": (178, 342, 330, 500),
        "hackathon": (340, 286, 489, 500),
        "studio": (500, 286, 688, 500),
    }
    extracted = {name: keep_largest_component(remove_connected_light_background(sheet.crop(box))) for name, box in crops.items()}
    order = ["bulletin", "leaderboard", "garden", "dev-table", "dev-table", "social-table", "hackathon", "studio"]
    atlas = Image.new("RGBA", (FACILITY_FRAME[0] * 4, FACILITY_FRAME[1] * 2), (0, 0, 0, 0))
    for index, name in enumerate(order):
        frame = fit_transparent(extracted[name], FACILITY_FRAME, padding=5, bottom_align=True)
        atlas.alpha_composite(frame, ((index % 4) * FACILITY_FRAME[0], (index // 4) * FACILITY_FRAME[1]))
    atlas.save(output, optimize=True)


def character_source_cell(sheet: Image.Image, column: int, row: int) -> Image.Image:
    left = round(column * sheet.width / 9)
    right = round((column + 1) * sheet.width / 9)
    row_bounds = (0, 151, 271, 398, 530)
    top = row_bounds[row]
    bottom = row_bounds[row + 1]
    return sheet.crop((left, top, right, bottom))


def prepare_character_atlas(source: Image.Image, output: Path) -> None:
    sheet = source.crop((0, 553, 702, 1083))
    column_map = [0, 1, 2, 3, 4, 5, 1, 2, 6, 7, 3, 8]
    tea_row_map = [1, 2, 3, 1]
    atlas = Image.new("RGBA", (CHARACTER_FRAME[0] * 12, CHARACTER_FRAME[1] * 4), (0, 0, 0, 0))
    for out_row in range(4):
        for out_column, source_column in enumerate(column_map):
            source_row = tea_row_map[out_row] if out_column == 8 else out_row
            cell = keep_character_subject(remove_connected_light_background(character_source_cell(sheet, source_column, source_row)))
            frame = fit_transparent(cell, CHARACTER_FRAME, padding=12, bottom_align=True)
            atlas.alpha_composite(frame, (out_column * CHARACTER_FRAME[0], out_row * CHARACTER_FRAME[1]))
    atlas.save(output, optimize=True)


def soft_detail_mask(size: tuple[int, int], anchor: str) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    pixels = mask.load()
    fade = min(180, max(60, width // 3))
    for x in range(width):
        if anchor == "right":
            alpha = max(0, min(255, round(255 * x / fade)))
        elif anchor == "left":
            alpha = max(0, min(255, round(255 * (width - 1 - x) / fade)))
        else:
            edge = min(x, width - 1 - x)
            alpha = max(0, min(255, round(255 * edge / fade)))
        for y in range(height):
            pixels[x, y] = alpha
    return mask


def make_backplate(source: Image.Image, crop: tuple[int, int, int, int], tint: tuple[int, int, int], anchor: str) -> Image.Image:
    detail = source.crop(crop).convert("RGB")
    backdrop = detail.resize(CITY_SIZE, Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(24))
    backdrop = Image.blend(backdrop, Image.new("RGB", CITY_SIZE, tint), 0.38)
    target_height = CITY_SIZE[1]
    detail_width = max(1, round(detail.width * target_height / detail.height))
    sharp = detail.resize((detail_width, target_height), Image.Resampling.LANCZOS)
    if anchor == "right":
        x = CITY_SIZE[0] - detail_width
    elif anchor == "left":
        x = 0
    else:
        x = (CITY_SIZE[0] - detail_width) // 2
    mask = soft_detail_mask(sharp.size, anchor)
    backdrop.paste(sharp, (x, 0), mask)
    return ImageEnhance.Sharpness(backdrop).enhance(1.08)


def prepare_remotion_backplates(source: Image.Image, output_dir: Path) -> None:
    specs = {
        "identity": ((710, 553, 882, 798), (18, 24, 22), "right"),
        "timeline": ((883, 553, 1053, 798), (226, 219, 199), "left"),
        "evidence": ((1055, 553, 1224, 798), (185, 200, 192), "right"),
        "project": ((1226, 553, 1398, 798), (17, 23, 22), "left"),
        "research": ((710, 837, 938, 1079), (18, 23, 21), "right"),
        "skills": ((940, 837, 1167, 1079), (80, 31, 28), "left"),
        "closing": ((1169, 837, 1398, 1079), (20, 38, 32), "right"),
    }
    for name, (crop, tint, anchor) in specs.items():
        plate = make_backplate(source, crop, tint, anchor)
        plate.save(output_dir / f"{name}.jpg", quality=92, subsampling=0, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Split the Creator City generated montage into runtime assets.")
    parser.add_argument("source", type=Path)
    parser.add_argument("--public-dir", type=Path, default=Path("public"))
    args = parser.parse_args()

    source_path = args.source.resolve()
    public_dir = args.public_dir.resolve()
    city_dir = public_dir / "assets" / "city"
    remotion_dir = public_dir / "assets" / "remotion"
    source_dir = public_dir / "assets" / "source"
    for directory in (city_dir, remotion_dir, source_dir):
        directory.mkdir(parents=True, exist_ok=True)

    source = Image.open(source_path).convert("RGB")
    if source.size != (1402, 1122):
        raise ValueError(f"Expected the supplied 1402x1122 montage, received {source.size[0]}x{source.size[1]}")

    shutil.copy2(source_path, source_dir / "creator-city-montage-v1.jpg")
    prepare_city_background(source, city_dir / "beijing-courtyard.png")
    prepare_facility_atlas(source, city_dir / "facility-atlas.png")
    prepare_character_atlas(source, city_dir / "character-atlas.png")
    prepare_remotion_backplates(source, remotion_dir)

    print(f"Prepared city and Remotion assets under {public_dir}")


if __name__ == "__main__":
    main()
