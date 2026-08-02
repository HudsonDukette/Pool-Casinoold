import json
from pathlib import Path
d = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
print(f"Total files: {d.get('total_files', 0)}")
print(f"Total words: {d.get('total_words', 0)}")
print(f"Code: {len(d.get('files', {}).get('code', []))} files")
print(f"Docs: {len(d.get('files', {}).get('document', []))} files")
print(f"Papers: {len(d.get('files', {}).get('paper', []))} files")
print(f"Images: {len(d.get('files', {}).get('image', []))} files")
print(f"Video: {len(d.get('files', {}).get('video', []))} files")
print(f"Skipped sensitive: {len(d.get('skipped_sensitive', []))} files")
