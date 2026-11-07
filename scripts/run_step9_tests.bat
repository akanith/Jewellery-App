@echo off
set "PATH=%~dp0bin;%PATH%"
node --test tests/step9_phase1_phase2_validation.test.mjs
