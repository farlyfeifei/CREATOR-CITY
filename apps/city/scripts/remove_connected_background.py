"""Remove a near-white background only when it is connected to the image edge."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--transparent-threshold", type=int, default=8)
    parser.add_argument("--connected-threshold", type=int, default=42)
    parser.add_argument("--max-width", type=int, default=0)
    parser.add_argument("--quality", type=int, default=90)
    return parser.parse_args()


def white_distance(pixel: tuple[int, int, int, int]) -> int:
    red, green, blue, _alpha = pixel
    return max(255 - red, 255 - green, 255 - blue)


def main() -> None:
    args = parse_args()
    source = Path(args.input)
    destination = Path(args.output)
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    connected = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if connected[index] or white_distance(pixels[x, y]) > args.connected_threshold:
            return
        connected[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    span = max(1, args.connected_threshold - args.transparent_threshold)
    transparent = 0
    partial = 0
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if not connected[index]:
                continue
            distance = white_distance(pixels[x, y])
            if distance <= args.transparent_threshold:
                alpha = 0
                transparent += 1
            else:
                alpha = round(255 * (distance - args.transparent_threshold) / span)
                partial += 1
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, max(0, min(255, alpha)))

    if args.max_width and width > args.max_width:
        resized_height = round(height * args.max_width / width)
        image = image.resize((args.max_width, resized_height), Image.Resampling.LANCZOS)

    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.suffix.lower() == ".webp":
        image.save(destination, "WEBP", quality=args.quality, method=6)
    else:
        image.save(destination, optimize=True)
    print(
        f"Wrote {destination} ({image.width}x{image.height}, "
        f"transparent={transparent}, partial={partial})"
    )


if __name__ == "__main__":
    main()
