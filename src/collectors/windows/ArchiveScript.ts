import { powershellLiteral } from './PowerShell.ts';

/** Uses framework ZIP APIs without loading the optional PowerShell Archive module. */
export function archiveScript(archive: string, directory: string): string {
  return String.raw`
[void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem')
$root = [IO.Path]::GetFullPath(${powershellLiteral(directory)}).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
[void][IO.Directory]::CreateDirectory($root)
$zip = [IO.Compression.ZipFile]::OpenRead(${powershellLiteral(archive)})
try {
  foreach ($entry in $zip.Entries) {
    $target = [IO.Path]::GetFullPath([IO.Path]::Combine($root,$entry.FullName))
    if (-not $target.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) { throw 'Sensor archive contains an invalid destination path' }
    if ($entry.Name.Length -eq 0) { [void][IO.Directory]::CreateDirectory($target); continue }
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$true)
  }
} finally { $zip.Dispose() }
`;
}
