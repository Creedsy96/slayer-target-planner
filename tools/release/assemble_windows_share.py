"""Add notices and corresponding source to an already packaged Windows app.

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

ROOT = Path(__file__).resolve().parents[2]


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
    # Runtime data is bundled into app.asar. Its original JSON/art metadata is
    # already included under source/, so do not duplicate it beside the EXE.
    documentation = folder / "documentation"
    documentation.mkdir()
    shutil.copy2(ROOT / "THIRD_PARTY_NOTICES.txt", documentation)
    shutil.copy2(ROOT / "LICENSE", documentation / "COPYING-GPL-3.txt")
    electron_notices = documentation / "electron"
    electron_notices.mkdir()
    for name in ["LICENSE", "LICENSES.chromium.html", "version"]:
        shutil.move(str(folder / name), electron_notices / name)
    archive = subprocess.check_output(["git", "archive", "--format=tar", revision], cwd=ROOT)
    source.mkdir()
    with tarfile.open(fileobj=io.BytesIO(archive)) as output:
        output.extractall(source, filter="data")
    # Include the installed sources of all production npm dependencies, including
    # statically bundled dependencies, rather than only links to package registries.
    lock = json.loads((ROOT / "package-lock.json").read_text())
    licences = documentation / "dependency-licences"
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
    (documentation / "SOURCE-REVISION.txt").write_text(
        f"Slayer Target Planner {version}\nGit commit: {revision}\n"
        "https://github.com/Lolager23/slayer-target-planner\n"
        "Corresponding application, engine and production dependency source: ../source/\n",
        encoding="utf-8",
    )
    (folder / "READ ME.txt").write_text(
        f"SLAYER TARGET PLANNER {version}\n\n"
        "Open Slayer Target Planner.exe. Keep this complete folder together.\n"
        "For sharing, extract the complete matching Windows ZIP before running.\n"
        "Windows x64; unsigned. No installer, administrator access or Node required.\n\n"
        "Updates: checks the latest stable GitHub release at startup, downloads and\n"
        "verifies the Windows ZIP, then installs when you close the app. Settings\n"
        "offers Check for updates, Restart and update, and the automatic toggle.\n"
        "The previous application copy is retained for recovery.\n\n"
        "First launch: create a character or use Maxed. The Character Setup Wizard\n"
        "guides RuneLite imports and remaining facts; replay it in Settings.\n"
        "The first-hunt tutorial uses practice points and does not change your bank.\n\n"
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
        "Characters stay local in the application's user-data folder, outside this\n"
        "distribution. Export character JSON backups to transfer your plans.\n"
        "The private website and local application have separate character storage.\n\n"
        "Folder layout: source/ contains the complete corresponding application,\n"
        "engine, data and dependency sources; documentation/ contains licences,\n"
        "third-party notices and SOURCE-REVISION.txt. Runtime files beside the\n"
        "EXE, resources/ and locales/ are required by Electron; keep them together.\n\n"
        "Application/DPS code: GPL-3.0, no warranty. See documentation/ and\n"
        "source/README.md. Wiki data and Jagex artwork retain separate terms.\n"
        "resources/SHA256SUMS.txt verifies distribution files. The share/ folder\n"
        "contains the matching ZIP and its checksum for passing to someone else.\n",
        encoding="utf-8",
    )
    print(f"Assembled {version} documentation and corresponding source at {folder}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    assemble(parser.parse_args().folder)
