# Prepara el Windows de la MP80 para instalar Debian al lado: apaga el inicio rapido y libera espacio
# reduciendo C:. No abre ningun acceso remoto y pide confirmacion antes de cambiar algo.
# Se corre una vez, en una terminal de administrador de la MP80:
#   irm http://<ip de la laptop>:8765/preparar-windows-mp80.ps1 | iex
# Va sin acentos: Invoke-RestMethod lo lee como Latin-1 cuando el servidor no declara la codificacion.
$ErrorActionPreference = 'Stop'
$deseadoGB = 200 # espacio para Debian
$minimoGB = 60   # por debajo de esto Debian no cabe con holgura
$margenGB = 40   # lo que debe quedarle libre a Windows despues de reducir

$volumen = Get-Volume -DriveLetter C
$particion = Get-Partition -DriveLetter C
$soportado = Get-PartitionSupportedSize -DriveLetter C
$libreGB = [math]::Floor($volumen.SizeRemaining / 1GB)
$reducibleGB = [math]::Floor(($particion.Size - $soportado.SizeMin) / 1GB)
$bitlocker = (Get-BitLockerVolume -MountPoint 'C:' -ErrorAction SilentlyContinue).ProtectionStatus
if (-not $bitlocker) { $bitlocker = 'sin dato' }

Write-Host "C: mide $([math]::Round($particion.Size / 1GB)) GB y tiene $libreGB GB libres."
Write-Host "Windows permite reducirla hasta $reducibleGB GB."
Write-Host "Proteccion de BitLocker en C: $bitlocker"
if ("$bitlocker" -eq 'On') {
  Write-Host 'BitLocker esta activo: guarda la clave de recuperacion antes de instalar Debian'
  Write-Host '(manage-bde -protectors -get C: o aka.ms/myrecoverykey).'
}

$reducirGB = [math]::Min($deseadoGB, [math]::Min($reducibleGB, $libreGB - $margenGB))
if ($reducirGB -lt $minimoGB) {
  Write-Host "No alcanza: se podrian liberar $reducirGB GB y Debian necesita al menos $minimoGB. No se cambio nada."
  return
}

Write-Host ''
Write-Host "Se va a apagar el inicio rapido y reducir C: en $reducirGB GB, que quedan sin usar para Debian."
if ((Read-Host 'Escribe SI para continuar') -cne 'SI') {
  Write-Host 'Cancelado. No se cambio nada.'
  return
}
powercfg /h off
Resize-Partition -DriveLetter C -Size ($particion.Size - [int64]$reducirGB * 1GB)
$nueva = Get-Partition -DriveLetter C
Write-Host "Listo. C: mide ahora $([math]::Round($nueva.Size / 1GB)) GB y quedaron $reducirGB GB libres para Debian."
Write-Host 'El inicio rapido quedo apagado.'
