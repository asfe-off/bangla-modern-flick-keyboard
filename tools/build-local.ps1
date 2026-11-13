param(
    [string]$JavaHome,
    [string]$BuildTools,
    [string]$AndroidJar,
    [string]$SigningKeystore,
    [string]$OutDir
)
$ErrorActionPreference='Stop'
$projectDir=Split-Path -Parent $PSScriptRoot
if(-not $OutDir){$OutDir=Join-Path $projectDir 'build/local'}
foreach($item in @($JavaHome,$BuildTools,$AndroidJar)){if(-not (Test-Path -LiteralPath $item)){throw "Missing build dependency: $item"}}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir=(Resolve-Path -LiteralPath $OutDir).Path
$classesDir=Join-Path $OutDir 'classes'
$generatedDir=Join-Path $OutDir 'generated'
$dexDir=Join-Path $OutDir 'dex'
New-Item -ItemType Directory -Force -Path $classesDir,$generatedDir,$dexDir | Out-Null
function Invoke-Checked([string]$Executable,[string[]]$Arguments){& $Executable @Arguments;if($LASTEXITCODE -ne 0){throw "Build command failed ($LASTEXITCODE): $Executable"}}
$aapt=Join-Path $BuildTools 'aapt2.exe'
$manifestFile=Join-Path $OutDir 'AndroidManifest.xml'
$manifest=[System.IO.File]::ReadAllText((Join-Path $projectDir 'app/src/main/AndroidManifest.xml')).Replace('<manifest xmlns:android=', '<manifest package="dev.banglaflick.test" xmlns:android=')
[System.IO.File]::WriteAllText($manifestFile,$manifest,[System.Text.UTF8Encoding]::new($false))
Invoke-Checked $aapt @('compile','--dir',(Join-Path $projectDir 'app/src/main/res'),'-o',(Join-Path $OutDir 'resources.zip'))
Invoke-Checked $aapt @('link','--manifest',$manifestFile,'-I',$AndroidJar,'--java',$generatedDir,'--auto-add-overlay','--min-sdk-version','26','--target-sdk-version','36','--version-code','3','--version-name','0.1.2-test','-A',(Join-Path $projectDir 'app/src/main/assets'),'-o',(Join-Path $OutDir 'resources.apk'),(Join-Path $OutDir 'resources.zip'))
$sourcePaths=@(Get-ChildItem -LiteralPath (Join-Path $projectDir 'app/src/main/java'),$generatedDir -Filter '*.java' -Recurse | ForEach-Object { '"'+$_.FullName.Replace('\','/')+'"' })
$sourceFile=Join-Path $OutDir 'sources.txt'
[System.IO.File]::WriteAllLines($sourceFile,$sourcePaths,[System.Text.UTF8Encoding]::new($false))
$bootClasspath=$AndroidJar+[System.IO.Path]::PathSeparator+(Join-Path $BuildTools 'core-lambda-stubs.jar')
Invoke-Checked (Join-Path $JavaHome 'bin/javac.exe') @('-encoding','UTF-8','-source','8','-target','8','-bootclasspath',$bootClasspath,'-d',$classesDir,('@'+$sourceFile))
Invoke-Checked (Join-Path $JavaHome 'bin/jar.exe') @('cf',(Join-Path $OutDir 'classes.jar'),'-C',$classesDir,'.')
Invoke-Checked (Join-Path $JavaHome 'bin/java.exe') @('-cp',(Join-Path $BuildTools 'lib/d8.jar'),'com.android.tools.r8.D8','--lib',$AndroidJar,'--min-api','26','--output',$dexDir,(Join-Path $OutDir 'classes.jar'))
$unsigned=Join-Path $OutDir 'unsigned.apk'
Copy-Item -LiteralPath (Join-Path $OutDir 'resources.apk') -Destination $unsigned -Force
Invoke-Checked (Join-Path $JavaHome 'bin/jar.exe') @('uf',$unsigned,'-C',$dexDir,'classes.dex')
$aligned=Join-Path $OutDir 'aligned.apk'
Invoke-Checked (Join-Path $BuildTools 'zipalign.exe') @('-f','4',$unsigned,$aligned)
$keys=Join-Path $projectDir 'test-signing'
New-Item -ItemType Directory -Force -Path $keys | Out-Null
$keystore=if($SigningKeystore){$SigningKeystore}else{Join-Path $keys 'local-test.p12'}
if(-not (Test-Path -LiteralPath $keystore)){
    Invoke-Checked (Join-Path $JavaHome 'bin/keytool.exe') @('-genkeypair','-keystore',$keystore,'-storetype','PKCS12','-storepass','android','-keypass','android','-alias','banglaflick-test','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Bangla Flick Local Test,O=Personal Development,C=BD')
}
$apk=Join-Path $OutDir 'Bangla-Modern-Flick-Keyboard-0.1.2-test.apk'
Invoke-Checked (Join-Path $JavaHome 'bin/java.exe') @('-jar',(Join-Path $BuildTools 'lib/apksigner.jar'),'sign','--ks',$keystore,'--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','banglaflick-test','--out',$apk,$aligned)
Invoke-Checked (Join-Path $JavaHome 'bin/java.exe') @('-jar',(Join-Path $BuildTools 'lib/apksigner.jar'),'verify','--verbose',$apk)
Invoke-Checked (Join-Path $BuildTools 'zipalign.exe') @('-c','4',$apk)
Write-Output "Built: $apk"
