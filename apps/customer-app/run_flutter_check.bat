@echo off
cd /d "e:\Ramyas Jeweller App\apps\customer-app"
echo Running flutter pub get...
call flutter pub get
echo.
echo Running flutter analyze...
call flutter analyze
echo.
echo Done!
