import pandas as pd
from pathlib import Path

root = Path(r"C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated")
rows = []

for p in sorted(root.glob("*Completer Survey 2018.xlsx")):
    try:
        df = pd.read_excel(p)
    except Exception:
        continue

    if "PAY" not in df.columns:
        continue

    pay = pd.to_numeric(df["PAY"], errors="coerce").dropna()
    if len(pay) == 0:
        continue

    cert = p.stem.split(" Completer Survey")[0]
    rows.append(
        {
            "cert": cert,
            "n": int(len(pay)),
            "avg": float(pay.mean()),
            "median": float(pay.median()),
        }
    )

out = pd.DataFrame(rows).sort_values("cert")
print(out.to_string(index=False))
if len(out):
    overall = (out["avg"] * out["n"]).sum() / out["n"].sum()
    print(f"overall_avg {overall:.2f} n {int(out['n'].sum())}")
