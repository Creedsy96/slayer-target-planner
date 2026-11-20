"""Add data, notices and corresponding source to an already packaged Windows app.

Run from a committed checkout, before package_share.py. No profiles, credentials,
Git metadata or local test artifacts are copied. Existing source is never replaced.
"""
import argparse
import io
import json
import shutil
import subprocess
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def assemble(folder: Path) -> None:
    folder = folder.resolve(strict=True)
    if not (folder / "Slayer Target Planner.exe").is_file():
        raise ValueError("Choose the packaged Windows application directory")
    source = folder / "source"
    if source.exists():
        raise ValueError("Corresponding source already exists; use a new distribution")
    if any(p.is_symlink() or p.is_junction() for p in folder.rglob("*")):
        raise ValueError("Distribution must contain ordinary copied files")
    revision = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    version = json.loads((ROOT / "package.json").read_text())["version"]
    for name in ["catalogue", "area-access", "mortimer-modifiers", "variant-additions",
                 "creature-guide", "equipment-requirements", "item-names", "open-areas"]:
        shutil.copy2(ROOT / "data" / f"{name}.json", folder)
    for name in ["creature-art", "item-art", "owned-art"]:
        shutil.copy2(ROOT / "src/ui" / f"{name}.json", folder)
    shutil.copy2(ROOT / "THIRD_PARTY_NOTICES.txt", folder)
    shutil.copy2(ROOT / "LICENSE", folder / "COPYING-GPL-3.txt")
    archive = subprocess.check_output(["git", "archive", "--format=tar", revision], cwd=ROOT)
    source.mkdir()
    with tarfile.open(fileobj=io.BytesIO(archive)) as output:
        output.extractall(source, filter="data")
    # Include the installed sources of all production npm dependencies, including
    # statically bundled dependencies, rather than only links to package registries.
    lock = json.loads((ROOT / "package-lock.json").read_text())
    licences = folder / "dependency-licences"
    licences.mkdir()
    for relative, record in lock["packages"].items():
        if not relative.startswith("node_modules/") or record.get("dev"):
            continue
        original = (ROOT / relative).resolve(strict=True)
        if not original.is_relative_to(ROOT / "node_modules"):
            raise ValueError("Dependency source escaped node_modules")
        if any(p.is_symlink() or p.is_junction() for p in original.rglob("*")):
            raise ValueError("Dependency source contains links")
        target = source / relative
        if not target.exists():
            shutil.copytree(original, target)
        for notice in original.iterdir():
            if notice.is_file() and notice.name.upper().startswith(("LICEN", "COPYING")):
                name = relative.removeprefix("node_modules/").replace("/", "_")
                shutil.copy2(notice, licences / f"{name}-{notice.name}")
    (folder / "SOURCE-REVISION.txt").write_text(
        f"Slayer Target Planner {version}\nGit commit: {revision}\n"
        "https://github.com/Lolager23/slayer-target-planner\n"
        "Corresponding application, engine and production dependency source: source/\n",
        encoding="utf-8",
    )
    (folder / "READ ME.txt").write_text(
        f"SLAYER TARGET PLANNER {version}\n\n"
        "Open Slayer Target Planner.exe. Keep this complete folder together.\n"
        "For sharing, extract the complete matching Windows ZIP before running.\n"
        "Windows x64; unsigned. No installer, administrator access or Node required.\n\n"
        "Bank & gear: import Character Export bank/inventory/equipment JSON files,\n"
        "optionally with character.json for base skills. Review before applying.\n"
        "Group Storage is not exported by that plugin; add shared items manually\n"
        "or import an explicitly identified group snapshot. Inclusion is optional.\n"
        "Manual quantities survive later imports; zero marks unavailable.\n\n"
        "Creature guide: OSRS equipment layout, mid/max examples, and Best in your\n"
        "Slots melee/ranged/magic alternatives, DPS and expected kill time.\n"
        "Settings controls combat assumptions, automatic hunter timing, themes,\n"
        "optional sections and restricted-account area pickers. Measured methods\n"
        "and boss/unsupported encounters retain visibly explained configured timing.\n\n"
        "Profiles stay local in the application's user-data folder, outside this\n"
        "distribution. Export profile JSON backups to transfer your plans.\n"
        "The private website and local application have separate profile storage.\n\n"
        "Application/DPS code: GPL-3.0, no warranty. See COPYING-GPL-3.txt,\n"
        "THIRD_PARTY_NOTICES.txt, dependency-licences/ and source/README.md.\n"
        "Wiki data and Jagex artwork retain separate terms. SOURCE-REVISION.txt\n"
        "identifies the exact source. SHA256SUMS.txt verifies distribution files.\n",
        encoding="utf-8",
    )
    print(f"Assembled {version} data, notices and source at {folder}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    assemble(parser.parse_args().folder)
