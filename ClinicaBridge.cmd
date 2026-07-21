@echo off
rem ClinicaBridge launcher — opens the app in Chrome (falls back to Edge/default browser)
set "APP=%~dp0index.html"
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%APP%"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%APP%"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%APP%"
) else (
  start "" "%APP%"
)
