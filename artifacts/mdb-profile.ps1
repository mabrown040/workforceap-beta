$ErrorActionPreference = 'Stop'
$root = 'C:\Users\mabro\Downloads\historical-student-data'
$outCsv = 'C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta\artifacts\historical-mdb-table-counts-2026-03-22.csv'
$rows = @()

Get-ChildItem -Path $root -Filter *.mdb -File | ForEach-Object {
  $dbPath = $_.FullName
  $connStr = 'Driver={Microsoft Access Driver (*.mdb)};Dbq=' + $dbPath + ';Uid=Admin;Pwd=;'
  try {
    $conn = New-Object System.Data.Odbc.OdbcConnection($connStr)
    $conn.Open()
    $schema = $conn.GetSchema('Tables')
    $tables = $schema | Where-Object { $_.TABLE_TYPE -eq 'TABLE' -and $_.TABLE_NAME -notlike 'MSys*' }
    foreach ($t in $tables) {
      $tableName = $t.TABLE_NAME
      $count = $null
      $status = 'ok'
      try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT COUNT(*) AS c FROM [$tableName]"
        $count = [int]$cmd.ExecuteScalar()
      } catch {
        $status = 'count_error: ' + $_.Exception.Message
      }
      $rows += [pscustomobject]@{
        database = $dbPath
        table = $tableName
        rowCount = $count
        status = $status
      }
    }
    $conn.Close()
  } catch {
    $rows += [pscustomobject]@{
      database = $dbPath
      table = ''
      rowCount = ''
      status = 'open_error: ' + $_.Exception.Message
    }
  }
}

$rows | Export-Csv -NoTypeInformation -Path $outCsv -Encoding UTF8
Write-Output $outCsv
