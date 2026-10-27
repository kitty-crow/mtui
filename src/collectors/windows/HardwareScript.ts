/** Headless library host. One process owns the hardware handles until stdin closes. */
export const hardwareScript = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$computer = $null
function Read-Hardware($hardware, $inheritedCpu) {
  $hardware.Update()
  $isCpu = $inheritedCpu -or ([string]$hardware.HardwareType -eq 'Cpu')
  foreach ($sensor in $hardware.Sensors) {
    if ([string]$sensor.SensorType -notin @('Temperature','Fan','Voltage','Power','Control')) { continue }
    [pscustomobject]@{
      Identifier = [string]$sensor.Identifier
      Name = [string]$sensor.Name
      Parent = [string]$hardware.Name
      SensorType = [string]$sensor.SensorType
      Value = $sensor.Value
      Component = $(if ($isCpu) { 'cpu' } else { 'other' })
    }
  }
  foreach ($child in $hardware.SubHardware) { Read-Hardware $child $isCpu }
}
try {
  $admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $admin) { throw 'CPU and motherboard sensors require an administrator terminal.' }
  if (-not (Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Services\PawnIO')) { throw 'Hardware sensor driver missing. Run mtui.exe --setup-sensors once as administrator.' }
  [void][Reflection.Assembly]::LoadFrom((Join-Path (Get-Location) 'LibreHardwareMonitorLib.dll'))
  $computer = New-Object LibreHardwareMonitor.Hardware.Computer
  $computer.IsCpuEnabled = $true
  $computer.IsMotherboardEnabled = $true
  $computer.IsMemoryEnabled = $true
  $computer.IsGpuEnabled = $true
  $computer.IsControllerEnabled = $true
  $computer.Open()
  while ($null -ne ($request = [Console]::ReadLine())) {
    if ($request -ne 'sample') { continue }
    $values = @(foreach ($hardware in $computer.Hardware) { Read-Hardware $hardware $false })
    $available = @($values | Where-Object { $null -ne $_.Value })
    if ($available.Count -eq 0) { throw 'No hardware readings exposed. Check the PawnIO driver and administrator permissions.' }
    $packet = @{ sensors = $values }
    [Console]::Out.WriteLine((ConvertTo-Json -InputObject $packet -Compress -Depth 4))
    [Console]::Out.Flush()
  }
} catch {
  [Console]::Out.WriteLine((ConvertTo-Json -InputObject @{ error = $_.Exception.Message } -Compress))
  [Console]::Out.Flush()
} finally {
  if ($null -ne $computer) { $computer.Close() }
}
`;
