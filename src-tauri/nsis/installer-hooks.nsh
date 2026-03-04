; installer-hooks.nsh — Hooks NSIS para el instalador de Stacklume
;
; NSIS_HOOK_PREINSTALL: se ejecuta ANTES de copiar archivos.
; Garantiza que Stacklume y su proceso hijo node.exe estén cerrados
; antes de que el instalador intente sobrescribir los archivos del programa.

!macro NSIS_HOOK_PREINSTALL
  ; 1. Cerrar stacklume.exe SIN /T — no matar el árbol de procesos.
  ;    El instalador puede ser hijo de stacklume.exe (actualización automática);
  ;    con /T se mataría a sí mismo. El Job Object se encarga de cerrar node.exe.
  nsExec::Exec 'taskkill /F /IM stacklume.exe'

  ; 2. Cerrar cualquier node.exe huérfano del directorio de instalación
  ;    (por si el Job Object no actuó todavía o la app crasheó sin limpiar)
  nsExec::Exec 'powershell -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $$_.Path -like ''*\Stacklume\*'' } | Stop-Process -Force"'

  ; 3. Esperar a que los procesos terminen completamente
  Sleep 1500
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Cerrar stacklume.exe SIN /T — mismo motivo que PREINSTALL:
  ; si el desinstalador fue lanzado desde la actualización automática,
  ; está en el árbol de stacklume.exe y /T lo mataría a sí mismo.
  nsExec::Exec 'taskkill /F /IM stacklume.exe'
  nsExec::Exec 'powershell -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $$_.Path -like ''*\Stacklume\*'' } | Stop-Process -Force"'
  Sleep 1000
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
