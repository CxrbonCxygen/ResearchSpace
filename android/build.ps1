param([string]$WebProject=(Join-Path $PSScriptRoot '..\web'))
$ErrorActionPreference='Stop'
$appRoot=$PSScriptRoot
$toolsRoot=[IO.Path]::GetFullPath((Join-Path $appRoot '..\android-build-tools'))
$signingRoot=Join-Path $appRoot '.local-signing'
New-Item -ItemType Directory -Force -Path $signingRoot | Out-Null
$passwordFile=Join-Path $signingRoot 'password.dpapi.xml'
if(!(Test-Path -LiteralPath $passwordFile)){
  $secretBytes=New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Fill($secretBytes)
  $securePassword=ConvertTo-SecureString ([Convert]::ToBase64String($secretBytes)) -AsPlainText -Force
  $securePassword | Export-Clixml -LiteralPath $passwordFile
}
$securePassword=Import-Clixml -LiteralPath $passwordFile
$secretPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$previousJava=$env:JAVA_HOME
try{
  $env:RESEARCHSPACE_APK_KS_PASS=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  $env:JAVA_HOME=Join-Path $toolsRoot 'jdk17\jdk17.0.20_12'
  $env:PYTHONIOENCODING='utf-8'
  python (Join-Path $appRoot 'build.py') --web-project $WebProject --tools $toolsRoot
  if($LASTEXITCODE -ne 0){throw 'Android package build failed'}
}finally{
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  Remove-Item Env:RESEARCHSPACE_APK_KS_PASS -ErrorAction SilentlyContinue
  $env:JAVA_HOME=$previousJava
}
