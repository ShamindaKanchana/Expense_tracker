@echo off
echo Updating .gitignore and cleaning repository...

echo # Adding common patterns to .gitignore
echo. >> .gitignore
echo # Build outputs >> .gitignore
echo /node_modules/ >> .gitignore
echo /dist/ >> .gitignore
echo /build/ >> .gitignore
echo /.next/ >> .gitignore
echo. >> .gitignore
echo # Environment files >> .gitignore
echo .env >> .gitignore
echo .env.local >> .gitignore
echo .env.*.local >> .gitignore
echo. >> .gitignore
echo # Logs >> .gitignore
echo *.log >> .gitignore
echo npm-debug.log* >> .gitignore
echo yarn-debug.log* >> .gitignore
echo yarn-error.log* >> .gitignore
echo. >> .gitignore
echo # Editor files and directories >> .gitignore
echo .idea/ >> .gitignore
echo .vscode/ >> .gitignore
echo *.suo >> .gitignore
echo *.ntvs* >> .gitignore
echo *.njsproj >> .gitignore
echo *.sln >> .gitignore
echo *.sw? >> .gitignore
echo. >> .gitignore
echo # OS generated files >> .gitignore
echo .DS_Store >> .gitignore
echo Thumbs.db >> .gitignore
echo. >> .gitignore

echo.
echo To complete the cleanup, run these commands:
echo 1. git rm -r --cached .
echo 2. git add .
echo 3. git commit -m "Clean up repository and update .gitignore"

pause
