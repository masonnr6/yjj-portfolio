from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
YEARS = ("2026", "2025", "2024", "2023", "2022")
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}
EXCLUDED_PROJECTS = {"兔宝宝"}
RESAMPLE = Image.Resampling.LANCZOS


def save_image(image: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    prepared = image.convert("RGB")
    if path.suffix == ".avif":
        prepared.save(path, quality=quality, speed=6)
    else:
        prepared.save(path, quality=quality, method=6)


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    width = min(width, image.width)
    height = round(image.height * width / image.width)
    return image.resize((width, height), RESAMPLE)


def resize_long_edge(image: Image.Image, long_edge: int) -> Image.Image:
    source_long_edge = max(image.size)
    if source_long_edge <= long_edge:
        return image.copy()
    scale = long_edge / source_long_edge
    return image.resize(
        (round(image.width * scale), round(image.height * scale)),
        RESAMPLE,
    )


def export_pair(image: Image.Image, base_path: Path, quality: int) -> None:
    save_image(image, base_path.with_suffix(".webp"), quality)
    save_image(image, base_path.with_suffix(".avif"), max(quality - 4, 45))


def project_image_data(
    source: Path,
    project_id: str,
    image_index: int,
    project_name: str,
    is_cover: bool,
) -> dict:
    with Image.open(source) as raw:
        image = ImageOps.exif_transpose(raw)
        width, height = image.size
        asset_dir = ROOT / "assets" / "projects" / project_id
        image_stem = f"image-{image_index:02d}"

        detail_entries = []
        for edge in (1200, 2400):
            resized = resize_long_edge(image, edge)
            export_pair(resized, asset_dir / f"{image_stem}-d{edge}", 82)
            detail_entries.append(
                {
                    "edge": edge,
                    "width": resized.width,
                    "height": resized.height,
                }
            )

        data = {
            "src": f"assets/projects/{project_id}/{image_stem}-d2400.webp",
            "srcset": ", ".join(
                f"assets/projects/{project_id}/{image_stem}-d{item['edge']}.webp "
                f"{item['width']}w"
                for item in detail_entries
            ),
            "avifSrcset": ", ".join(
                f"assets/projects/{project_id}/{image_stem}-d{item['edge']}.avif "
                f"{item['width']}w"
                for item in detail_entries
            ),
            "width": width,
            "height": height,
            "alt": f"{project_name} 项目作品 {image_index}",
        }

        if is_cover:
            cover_entries = []
            for target_width in (640, 1200, 1600):
                resized = resize_to_width(image, target_width)
                export_pair(
                    resized,
                    asset_dir / f"{image_stem}-w{target_width}",
                    80,
                )
                cover_entries.append(
                    {
                        "target": target_width,
                        "width": resized.width,
                    }
                )

            data["src"] = (
                f"assets/projects/{project_id}/{image_stem}-w1200.webp"
            )
            data["srcset"] = ", ".join(
                f"assets/projects/{project_id}/{image_stem}-w{item['target']}.webp "
                f"{item['width']}w"
                for item in cover_entries
            )
            data["avifSrcset"] = ", ".join(
                f"assets/projects/{project_id}/{image_stem}-w{item['target']}.avif "
                f"{item['width']}w"
                for item in cover_entries
            )

        return data


def build_projects() -> list[dict]:
    projects = []
    for year in YEARS:
        year_dir = ROOT / year
        project_dirs = sorted(
            (
                path
                for path in year_dir.iterdir()
                if path.is_dir() and path.name not in EXCLUDED_PROJECTS
            ),
            key=lambda path: path.name.casefold(),
        )
        for project_index, project_dir in enumerate(project_dirs, start=1):
            project_id = f"p-{year}-{project_index:02d}"
            image_files = sorted(
                (
                    path
                    for path in project_dir.iterdir()
                    if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
                ),
                key=lambda path: path.name.casefold(),
            )
            images = [
                project_image_data(
                    source=image_path,
                    project_id=project_id,
                    image_index=image_index,
                    project_name=project_dir.name,
                    is_cover=image_index == 1,
                )
                for image_index, image_path in enumerate(image_files, start=1)
            ]
            projects.append(
                {
                    "id": project_id,
                    "year": int(year),
                    "name": project_dir.name,
                    "cover": images[0],
                    "images": images,
                }
            )
    return projects


def build_hero(source_path: Path) -> None:
    hero_dir = ROOT / "assets" / "hero"
    hero_dir.mkdir(parents=True, exist_ok=True)
    hero_source = hero_dir / "hero-source.png"
    if source_path.resolve() != hero_source.resolve():
        shutil.copy2(source_path, hero_source)

    with Image.open(source_path) as raw:
        image = ImageOps.fit(
            raw.convert("RGB"),
            (3840, 2160),
            method=RESAMPLE,
            centering=(0.5, 0.5),
        )
        for width in (960, 1600, 2400, 3840):
            resized = resize_to_width(image, width)
            export_pair(resized, hero_dir / f"hero-{width}", 84)


def write_project_data(projects: list[dict]) -> None:
    serialized = json.dumps(projects, ensure_ascii=False, indent=2)
    output = (
        "/* Generated by tools/build_assets.py. */\n"
        f"window.PORTFOLIO_PROJECTS = {serialized};\n"
    )
    (ROOT / "projects.js").write_text(output, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hero", required=True, type=Path)
    args = parser.parse_args()

    build_hero(args.hero)
    projects = build_projects()
    write_project_data(projects)

    image_count = sum(len(project["images"]) for project in projects)
    print(f"Built {len(projects)} projects and {image_count} images.")


if __name__ == "__main__":
    main()
