# setup_android_env.ps1
# Configures environment variables for Android SDK and Java JDK

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\nirwa\AppData\Local\Android\Sdk"

# Construct paths
$JavaBin = "$env:JAVA_HOME\bin"
$AndroidPlatformTools = "$env:ANDROID_HOME\platform-tools"
$AndroidEmulator = "$env:ANDROID_HOME\emulator"

# Update PATH for the current session
$Paths = @($JavaBin, $AndroidPlatformTools, $AndroidEmulator)
foreach ($Path in $Paths) {
    if ($env:PATH -notlike "*$Path*") {
        $env:PATH = "$Path;$env:PATH"
    }
}

Write-Host "✅ Android Environment Set Successfully!"
Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
