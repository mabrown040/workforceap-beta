# Historical Salary / Before-After Findings

Generated: 2026-03-22

## Verdict

- Structured salary/outcome evidence was found in the 2018 completer survey workbooks.
- No explicit pre-salary/post-salary, before-salary/after-salary, promotion, or raise columns were found in the wider Excel scan.
- The strongest external-safe value evidence is post-completion outcome data: `PAY`, `PLACE OF WORK`, and `TITLE/POSITION` in completer surveys.
- MDBs contain highly relevant table names such as `StudentFinance Table`, `Graduates`, `FinalEnrollment Table`, and `PreEnrollment Table`, but those tables were permission-blocked and could not be used as evidence.

## Primary Evidence Found

### 1. Completer surveys contain structured pay and employment outcomes

Files scanned:

- `C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated\1-SQLPMP Completer Survey 2018.xlsx`
- `C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated\2-PMP Completer Survey 2018.xlsx`
- `C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated\3-JAVASQL Completer Survey 2018.xlsx`
- `C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated\4-MCITP Completer Survey 2018.xlsx`
- `C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated\5-MOSCAPM Completer Survey 2018.xlsx`
- `C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated\6-IMDBOS Completer Survey 2018.xlsx`
- `C:\Users\mabro\Downloads\historical-student-data\CSN 2018 Completers Survey-Updated\7-Web Com Manager Completer Survey 2018.xlsx`

Common outcome columns present in all 7 original survey files:

- `PLACE OF WORK`
- `WORK PHONE`
- `TITLE/POSITION`
- `PAY`

Aggregated completer survey evidence:

- Survey files with structured pay fields: 7
- Total respondent rows: 67
- Rows with numeric `PAY`: 63
- Rows with populated `PLACE OF WORK`: 63
- Rows with populated `TITLE/POSITION`: 63
- Distinct workplaces recorded: 53
- Distinct titles recorded: 55
- Start date range across these completer records: 2017-03-07 to 2018-02-22
- End date range across these completer records: 2018-02-22 to 2019-03-02

`PAY` distribution across the 63 numeric entries:

- Min: 14.0
- 25th percentile: 28.0
- Median: 37.5
- 75th percentile: 45.5
- Max: 72.5
- Mean: 37.68

Pay bands:

- `<20`: 3
- `20-29.99`: 15
- `30-39.99`: 19
- `40-49.99`: 12
- `50+`: 14

Program-level medians:

- `1-SQLPMP`: 39.0
- `2-PMP`: 50.0
- `3-JAVASQL`: 43.0
- `4-MCITP`: 18.0
- `5-MOSCAPM`: 23.0
- `6-IMDBOS`: 24.0
- `7-Web Com Manager`: 26.5

Inference:

- `PAY` appears to be a post-completion compensation field because it sits beside `PLACE OF WORK` and `TITLE/POSITION` in completer survey files.
- The dataset supports post-program outcome proof, but not true before-vs-after salary uplift proof.

### 2. Master student spreadsheets provide completion and contactability proxies, not salary

Latest master audit workbook:

- File: `C:\Users\mabro\Downloads\historical-student-data\Office Admin\STUDENT DATABASE\2020 ALL Audit Master Document as of 2-3-20 at 5pm.xlsx`
- Rows: 834
- Start dates present: 826
- End dates present: 824
- Start date range: 2008-10-06 to 2020-02-03
- Duration from `Start` to `End` where measurable: 817 rows
- Median duration: 152 days
- Interquartile range: 93 to 200 days
- Rows with email: 825
- Rows with any phone: 830

Prior master workbook:

- File: `C:\Users\mabro\Downloads\historical-student-data\Office Admin\STUDENT DATABASE\10-12-18 MASTER CSN MASTER SORTED 11-15-19 Student Spreadsheet 2008-2019--TWC --w notations.xlsx`
- Rows: 807
- End dates present: 797
- Duration from `Start` to `End` where measurable: 790 rows
- Median duration: 156 days
- Rows with email: 798
- Rows with any phone: 803

These files are strong proxy evidence for:

- completion / end-date capture
- cohort volume over time
- contactability
- estimated time-to-completion

These files are not strong evidence for:

- salary
- wage growth
- pre/post employment change
- promotions or raises

## Exact Proof Of Absence In The Wider Excel Scan

Targeted Excel scan coverage:

- Candidate files selected: 110
- Successfully scanned: 109
- Sheets scanned: 225
- Columns scanned: 2,779
- One legacy `.xls` file (`Training Attendance Log.xls`) could not be parsed because `xlrd` is unavailable

Header hit counts across the 109 scanned Excel files:

- `salary`: 0
- `wage`: 0
- `income`: 0
- `compensation`: 0
- `employment`: 0
- `placement`: 0
- `promotion`: 0
- `raise`: 0
- `before/after/pre/post`: 0 outcome-specific headers
- `pay`: 23

Important `pay` caveat:

- Most `pay` hits outside the completer surveys were not salary fields.
- They were mainly tuition/admin/payment references such as `dates on payment` or free-text notes like `self pay`.

Important `salary` caveat:

- The wider scan found text values such as `need salary` inside an audit sheet, but no structured salary column headers beyond completer survey `PAY`.
- That means the workbook set contains salary requests/notes in some audit tabs, but not a reusable before/after salary table.

Not found as structured fields in scanned Excel headers:

- pre-salary
- post-salary
- before salary
- after salary
- salary increase
- wage increase
- promotion
- raise
- employment placed
- placement date

## MDB Findings And Limits

Existing MDB profile artifact reviewed:

- `artifacts/historical-mdb-table-counts-2026-03-22.csv`

MDB summary:

- MDB databases profiled: 7
- Open errors: 1
- Readable table counts: 36
- Permission-blocked table counts: 240

Relevant blocked tables repeatedly present across MDBs:

- `StudentFinance Table`
- `Graduates`
- `FinalEnrollment Table`
- `PreEnrollment Table`
- `Student Table`

Observed blocker text:

- `ERROR [42000] [Microsoft][ODBC Microsoft Access Driver] Record(s) cannot be read; no read permission on 'StudentFinance Table'.`

Assessment:

- MDB schema strongly suggests more finance/outcome data may exist.
- Because those tables were blocked, they were excluded from the value proof and from all aggregates in this report.
- This avoids over-claiming based on inaccessible sources.

## Best Substitute Outcome Proxies

If external messaging needs support beyond the completer survey salary evidence, the next-best proxies are:

1. Completion capture
   - 824 of 834 rows in the latest master workbook have an `End` date.
2. Time-to-completion
   - Median measurable start-to-end duration in the latest master workbook is 152 days.
3. Contactability
   - 825 of 834 latest-master rows have email.
   - 830 of 834 latest-master rows have at least one phone number.
4. Funnel / prospect coverage
   - `Potential Students January 2019 - Current.xlsx` contains 257 rows, with 252 emails and 251 phone numbers.
5. Program participation trends
   - Latest master workbook spans starts from 2008-10-06 through 2020-02-03 with strong program counts in `SQL/PMP`, `PMP`, `CSAD`, and `MOS/CAPM`.

## Recommended External-Safe Framing

Use:

- completer surveys captured post-program employer, title, and pay fields for 67 respondents across 7 programs
- 63 of those records include numeric pay values
- observed pay values ranged from 14.0 to 72.5, with a median of 37.5
- the broader student history shows strong completion and contactability coverage over 2008-2020

Do not use:

- before/after salary lift claims
- promotion/raise claims
- causal salary uplift claims from the broader archive

Those claims are not supported by the scanned accessible fields.

## Commands / Scripts Run

Existing artifacts/scripts reviewed:

- `Get-Content -Raw "C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-value-summary-2026-03-22.json"`
- `Get-Content -Raw "C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-student-story-scan-2026-03-22.json"`
- `Get-Content -Raw "C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-excel-priority-2026-03-22.csv"`
- `Get-Content -Raw "C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-mdb-table-counts-2026-03-22.csv"`
- `Get-Content -Raw "C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\build_historical_value_summary.py"`
- `Get-Content -Raw "C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\extract_historical_student_story_data.py"`
- `Get-Content -Raw "C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-data-scan-2026-03-22.txt"`

Primary analysis commands executed:

```powershell
@' ... candidate-file ranking scan over .xlsx/.xls ... '@ | python -
```

```powershell
@' ... 109-file / 225-sheet / 2,779-column keyword header and cell scan ... '@ | python -
```

```powershell
@' ... 7-file completer survey aggregate for PAY / PLACE OF WORK / TITLE-POSITION ... '@ | python -
```

```powershell
@' ... master workbook proxy analysis for Start / End / duration / contactability ... '@ | python -
```

```powershell
@' ... MDB artifact summary for ok vs permission-blocked tables ... '@ | python -
```

## Risks

- MDB outcome/finance tables were inaccessible, so additional salary or placement evidence may still exist there.
- `PAY` is stored without an explicit unit label; hourly interpretation is plausible but still an inference.
- One legacy `.xls` file was not parsed.
- Survey sample size is useful but not large enough for broad causal claims.

## Confidence

- Salary/outcome evidence exists: High
- True before/after salary evidence exists in accessible files: Low
- Completion/contactability proxy evidence exists: High
- Overall confidence in this report: Medium-high
