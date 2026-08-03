# create_emulator.ps1
# Sets up Android Command-line Tools and creates a Virtual Device (AVD)

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\nirwa\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

$SdkPath = $env:ANDROID_HOME
$CmdlineToolsPath = "$SdkPath\cmdline-tools"
$LatestToolsPath = "$CmdlineToolsPath\latest"

if (-not (Test-Path $LatestToolsPath)) {
    Write-Host "Command-line tools not found. Downloading..."
    $Url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $ZipPath = "$env:TEMP\cmdline-tools.zip"
    
    # Download
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing
    Write-Host "Download complete. Extracting..."
    
    # Extract to temp directory first
    $TempExtractPath = "$env:TEMP\cmdline-tools-extract"
    if (Test-Path $TempExtractPath) { Remove-Item $TempExtractPath -Recurse -Force }
    Expand-Archive -Path $ZipPath -DestinationPath $TempExtractPath
    
    # Move cmdline-tools to Sdk/cmdline-tools/latest
    if (-not (Test-Path $CmdlineToolsPath)) { New-Item -ItemType Directory -Path $CmdlineToolsPath }
    Move-Item -Path "$TempExtractPath\cmdline-tools" -Destination $LatestToolsPath -Force
    
    # Clean up
    Remove-Item $ZipPath -Force
    Remove-Item $TempExtractPath -Recurse -Force
    Write-Host "Command-line tools installed at $LatestToolsPath"
} else {
    Write-Host "Command-line tools already installed."
}

# Add cmdline-tools bin to path
$env:PATH = "$LatestToolsPath\bin;$env:PATH"

# Accept Android SDK licenses
Write-Host "Accepting licenses..."
# A simpler way to accept licenses on Windows:
# Echo 'y' and pipe it to sdkmanager --licenses
$LicensesCmd = "$LatestToolsPath\bin\sdkmanager.bat"
$ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo.FileName = $LicensesCmd
$ProcessInfo.Arguments = "--sdk_root=$SdkPath --licenses"
$ProcessInfo.RedirectStandardInput = $true
$ProcessInfo.RedirectStandardOutput = $true
$ProcessInfo.UseShellExecute = $false

$Process = [System.Diagnostics.Process]::Start($ProcessInfo)
for ($i=0; $i -lt 20; $i++) {
    $Process.StandardInput.WriteLine("y")
}
$Process.StandardInput.Close()
$Output = $Process.StandardOutput.ReadToEnd()
$Process.WaitForExit()
Write-Host $Output

# Create the Android Virtual Device (AVD)
Write-Host "Creating AVD..."
# We use the pre-downloaded android-36 google_apis system image
$Image = "system-images;android-36;google_apis_playstore;x86_64"

# avdmanager create avd -n "Testing_Pixel" -k $Image --device "pixel_5" --force
# Standard pipe to avdmanager to accept default config (echo "no")
$AvdCmd = "$LatestToolsPath\bin\avdmanager.bat"
$ProcessInfo2 = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo2.FileName = $AvdCmd
$ProcessInfo2.Arguments = "create avd -n Testing_Pixel -k $Image --device pixel_5 --force"
$ProcessInfo2.RedirectStandardInput = $true
$ProcessInfo2.RedirectStandardOutput = $true
$ProcessInfo2.UseShellExecute = $false

$Process2 = [System.Diagnostics.Process]::Start($ProcessInfo2)
$Process2.StandardInput.WriteLine("no")
$Process2.StandardInput.Close()
$Output2 = $Process2.StandardOutput.ReadToEnd()
$Process2.WaitForExit()
Write-Host $Output2

Write-Host "AVD Testing_Pixel created successfully!"
