$ErrorActionPreference = 'Stop'
$path='C:\Users\mabro\Downloads\historical-student-data\AAUL Student Database.mdb'
$connStr='Driver={Microsoft Access Driver (*.mdb)};Dbq=' + $path + ';Uid=Admin;Pwd=;'
$conn = New-Object System.Data.Odbc.OdbcConnection($connStr)
$conn.Open()
$schema = $conn.GetSchema('Tables')
$schema | Select-Object -First 40 TABLE_NAME,TABLE_TYPE | Format-Table -AutoSize
$conn.Close()
