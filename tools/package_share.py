"""Create and verify a shareable ZIP of the clean Windows distribution."""
import hashlib
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


folder = Path(sys.argv[1]).resolve(strict=True)
archive = Path(sys.argv[2]).resolve()
if archive.exists() or folder in archive.parents:
    raise SystemExit("Use a new archive path outside the distribution folder.")
files = sorted(p for p in folder.rglob("*") if p.is_file())
if any(p.is_symlink() or p.is_junction() for p in folder.rglob("*")):
    raise SystemExit("Distribution must contain ordinary copied files only.")
expected = {p.relative_to(folder).as_posix(): digest(p) for p in files if p.name != "SHA256SUMS.txt"}
checksums = folder / "SHA256SUMS.txt"
checksums.write_text("".join(f"{sha}  {name}\n" for name, sha in expected.items()), encoding="utf-8")
with ZipFile(archive, "x", compression=ZIP_DEFLATED, compresslevel=6) as output:
    for path in sorted(p for p in folder.rglob("*") if p.is_file()):
        output.write(path, (Path(folder.name) / path.relative_to(folder)).as_posix())
with ZipFile(archive) as output:
    for name, sha in expected.items():
        with output.open(f"{folder.name}/{name}") as stream:
            actual = hashlib.file_digest(stream, "sha256").hexdigest()
        if actual != sha:
            raise SystemExit(f"ZIP verification failed: {name}")
    if output.testzip() is not None:
        raise SystemExit("ZIP CRC verification failed.")
zip_hash = digest(archive)
archive.with_suffix(".zip.sha256.txt").write_text(f"{zip_hash}  {archive.name}\n", encoding="utf-8")
print(f"Verified {len(expected)} files. ZIP: {archive.stat().st_size / 1024**2:.1f} MiB. SHA-256: {zip_hash}")
