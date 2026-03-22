import json
from pathlib import Path
import pandas as pd

rank_csv = Path(r"C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-excel-priority-2026-03-22.csv")
out_json = Path(r"C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-student-story-scan-2026-03-22.json")

if not rank_csv.exists():
    raise SystemExit(f"Missing ranking CSV: {rank_csv}")

ranked = pd.read_csv(rank_csv)

# Keep higher-signal files and avoid duplicated training/how-to mirrors.
mask = (
    ~ranked["FullName"].str.contains(r"HOW TO'S", case=False, na=False)
    & ~ranked["FullName"].str.contains(r"BOOK SIGN SHEETS", case=False, na=False)
    & ~ranked["FullName"].str.contains(r"CSN Administrator Passwords", case=False, na=False)
)

# Focus on likely student-history datasets.
signal = ranked[mask].copy()
signal = signal[
    signal["FullName"].str.contains(
        r"student|enrolled|roster|class list|completer|survey|audit|contact|database|potential",
        case=False,
        na=False,
    )
]

signal = signal.sort_values(["score", "LastWriteTime"], ascending=[False, False])

selected = []
seen_names = set()
for _, row in signal.iterrows():
    p = row["FullName"]
    name = Path(p).name.lower()
    if name in seen_names:
        continue
    seen_names.add(name)
    selected.append(row)
    if len(selected) >= 20:
        break

results = []
for row in selected:
    fpath = Path(row["FullName"])
    item = {
        "file": str(fpath),
        "score": int(row["score"]),
        "size": int(row["Length"]),
        "lastWriteTime": str(row["LastWriteTime"]),
        "sheets": [],
        "error": None,
    }
    try:
        xl = pd.ExcelFile(fpath)
        for sheet in xl.sheet_names[:8]:
            try:
                df = xl.parse(sheet_name=sheet, nrows=5)
                columns = [str(c).strip() for c in df.columns.tolist()][:25]
                non_empty_cols = [c for c in columns if c and c.lower() != 'unnamed: 0']
                item["sheets"].append({
                    "name": sheet,
                    "sampleColumns": non_empty_cols,
                    "sampleRowsRead": int(len(df)),
                })
            except Exception as se:
                item["sheets"].append({"name": sheet, "error": str(se)})
    except Exception as e:
        item["error"] = str(e)

    results.append(item)

out_json.write_text(json.dumps({"files": results}, indent=2), encoding="utf-8")
print(str(out_json))
