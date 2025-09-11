#!/usr/bin/env python3
import argparse
import os
import shutil
from pathlib import Path


def iter_raw_dirs(root: Path):
    for p in root.rglob('raw'):
        if p.is_dir():
            # Only consider when there is a sibling 'interim'
            interim = p.parent / 'interim'
            if interim.exists() and interim.is_dir():
                yield p, interim


def ensure_unique_path(dest: Path) -> Path:
    if not dest.exists():
        return dest
    stem = dest.stem
    suffix = dest.suffix
    parent = dest.parent
    i = 1
    while True:
        candidate = parent / f"{stem} ({i}){suffix}"
        if not candidate.exists():
            return candidate
        i += 1


def move_item(src: Path, dst_dir: Path, on_conflict: str, dry_run: bool):
    target = dst_dir / src.name
    if target.exists():
        if on_conflict == 'skip':
            print(f"SKIP (exists): {target}")
            return
        elif on_conflict == 'overwrite':
            print(f"OVERWRITE: {target}")
            if not dry_run:
                if target.is_dir() and src.is_file():
                    raise RuntimeError(f"Cannot overwrite directory with file: {target}")
                if target.is_file() and src.is_dir():
                    # replace file with dir by removing file first
                    target.unlink()
                if target.is_dir():
                    shutil.rmtree(target)
                else:
                    target.unlink()
                # fall-through to move
        elif on_conflict == 'rename':
            new_target = ensure_unique_path(target)
            print(f"RENAME CONFLICT: {target} -> {new_target}")
            target = new_target
        else:
            raise ValueError(f"Unknown on_conflict: {on_conflict}")

    action = "MOVE DIR" if src.is_dir() else "MOVE"
    print(f"{action}: {src} -> {target}")
    if not dry_run:
        # Ensure destination directory exists
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(target))


def main():
    parser = argparse.ArgumentParser(description="Move all contents of 'raw' folders into sibling 'interim' and optionally remove empty 'raw' folders.")
    parser.add_argument('--root', type=Path, default=Path.cwd(), help='Root directory to scan (default: current working dir)')
    parser.add_argument('--on-conflict', choices=['skip', 'overwrite', 'rename'], default='skip', help='What to do when target exists (default: skip)')
    parser.add_argument('--delete-empty-raw', action='store_true', help='Delete raw folders if they become empty')
    parser.add_argument('--dry-run', action='store_true', help='Show actions without changing anything')
    parser.add_argument('--only-under', type=str, default='', help='Optional substring filter; only operate on raw dirs whose path contains this substring')
    args = parser.parse_args()

    root = args.root.resolve()
    print(f"Scanning under: {root}")

    pairs = list(iter_raw_dirs(root))
    if args.only_under:
        pairs = [p for p in pairs if args.only_under in str(p[0])]

    if not pairs:
        print("No eligible 'raw' folders found with sibling 'interim'.")
        return

    for raw_dir, interim_dir in pairs:
        print(f"---\nRAW: {raw_dir}\nINT: {interim_dir}")
        # Move files and subdirectories inside raw_dir to interim_dir
        for child in sorted(raw_dir.iterdir()):
            move_item(child, interim_dir, args.on_conflict, args.dry_run)

        # Optionally delete raw_dir if empty
        try:
            if args.delete_empty_raw:
                # Account for potential hidden files
                # Remove common OS cruft to enable empty deletion
                for cruft in ('.DS_Store', 'Thumbs.db', 'desktop.ini'):
                    cruft_path = raw_dir / cruft
                    if cruft_path.exists() and cruft_path.is_file():
                        print(f"DELETE CRUFT: {cruft_path}")
                        if not args.dry_run:
                            cruft_path.unlink()

                remaining = list(raw_dir.iterdir())
                if not remaining:
                    print(f"DELETE EMPTY: {raw_dir}")
                    if not args.dry_run:
                        raw_dir.rmdir()
                else:
                    print(f"KEEP (not empty): {raw_dir} -> contains {len(remaining)} item(s)")
        except Exception as e:
            print(f"WARN: could not delete {raw_dir}: {e}")

    print("---\nDone.")


if __name__ == '__main__':
    main()
