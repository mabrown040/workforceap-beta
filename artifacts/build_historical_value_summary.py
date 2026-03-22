import json
from pathlib import Path
import pandas as pd

files = [
    Path(r"C:\Users\mabro\Downloads\historical-student-data\Office Admin\STUDENT DATABASE\10-12-18 MASTER CSN MASTER SORTED 11-15-19 Student Spreadsheet 2008-2019--TWC --w notations.xlsx"),
    Path(r"C:\Users\mabro\Downloads\historical-student-data\Office Admin\STUDENT DATABASE\2020 ALL Audit Master Document as of 2-3-20 at 5pm.xlsx"),
    Path(r"C:\Users\mabro\Downloads\historical-student-data\Office Admin\Class Rosters 2019-2020\Potential Students January 2019 - Current.xlsx"),
    Path(r"C:\Users\mabro\Downloads\historical-student-data\Office Admin\CSN CONTACT LIST.xlsx"),
]

out = Path(r"C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-value-summary-2026-03-22.json")

summary = {"datasets": []}

for p in files:
    if not p.exists():
        summary["datasets"].append({"file": str(p), "error": "missing"})
        continue

    try:
        df = pd.read_excel(p)
    except Exception as e:
        summary["datasets"].append({"file": str(p), "error": str(e)})
        continue

    raw_cols = list(df.columns)
    cols = [str(c).strip() for c in raw_cols]
    norm = {str(c).strip().lower(): c for c in raw_cols}

    ds = {
        "file": str(p),
        "rows": int(len(df)),
        "columns": cols,
        "nonNullByColumn": {},
        "insights": {},
    }

    for raw, label in zip(raw_cols[:20], cols[:20]):
        ds["nonNullByColumn"][label] = int(df[raw].notna().sum())

    # Date insights
    start_col = next((norm[k] for k in norm if k.startswith("start")), None)
    end_col = next((norm[k] for k in norm if k.startswith("end")), None)
    class_col = next((norm[k] for k in norm if k == "class" or "class" in k), None)
    city_col = next((norm[k] for k in norm if k == "city"), None)

    if start_col:
        s = pd.to_datetime(df[start_col], errors="coerce")
        ds["insights"]["startDateMin"] = str(s.min().date()) if s.notna().any() else None
        ds["insights"]["startDateMax"] = str(s.max().date()) if s.notna().any() else None
        if s.notna().any():
            by_year = s.dt.year.value_counts().sort_index()
            ds["insights"]["startsByYear"] = {str(int(k)): int(v) for k, v in by_year.items()}

    if end_col:
        e = pd.to_datetime(df[end_col], errors="coerce")
        ds["insights"]["recordsWithEndDate"] = int(e.notna().sum())

    if class_col:
        top_class = df[class_col].astype(str).str.strip().replace("nan", pd.NA).dropna().value_counts().head(10)
        ds["insights"]["topClasses"] = {str(k): int(v) for k, v in top_class.items()}

    if city_col:
        top_city = df[city_col].astype(str).str.strip().replace("nan", pd.NA).dropna().value_counts().head(10)
        ds["insights"]["topCities"] = {str(k): int(v) for k, v in top_city.items()}

    # Contactability signals without exposing PII
    email_col = next((norm[k] for k in norm if "mail" in k), None)
    phone_cols = [norm[k] for k in norm if "phone" in k]

    if email_col:
        ds["insights"]["rowsWithEmail"] = int(df[email_col].notna().sum())
    if phone_cols:
        ds["insights"]["rowsWithAnyPhone"] = int(df[phone_cols].notna().any(axis=1).sum())

    summary["datasets"].append(ds)

out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(str(out))
