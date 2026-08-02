import json
from pathlib import Path
from collections import Counter

d = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
scan_root = d.get('scan_root', '')

# Collect all files from all categories
all_files = []
for cat in ['code', 'document', 'paper', 'image', 'video']:
    all_files.extend(d.get('files', {}).get(cat, []))

# Filter out graphify-out converted sidecars
all_files = [f for f in all_files if not f.startswith(scan_root + "/graphify-out/")]

# Get first-level subdirectories
subdirs = []
for f in all_files:
    if f.startswith(scan_root):
        rel = f[len(scan_root):].lstrip('/\\')
        # Normalize path separators
        rel = rel.replace('\\', '/')
        parts = rel.split('/')
        if parts[0]:
            subdirs.append(parts[0])
        else:
            subdirs.append('(root)')

# Count and rank
counts = Counter(subdirs)
print("Top 5 subdirectories by file count:")
for subdir, count in counts.most_common(5):
    print(f"  {subdir}: {count} files")
