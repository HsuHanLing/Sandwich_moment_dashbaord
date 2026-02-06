# Push to GitHub - run this script
Set-Location $PSScriptRoot

# Remove existing git if it points to wrong root (e.g. user home)
if (Test-Path .git) {
    $root = git rev-parse --show-toplevel 2>$null
    if ($root -and $root -ne $PSScriptRoot) {
        Write-Host "Git repo is at parent: $root - initializing fresh in project"
        Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
    }
}

# Init if no .git
if (-not (Test-Path .git)) {
    git init
}

# Add remote (replace if exists)
git remote remove origin 2>$null
git remote add origin https://github.com/deynnchan-maker/analyticsdashboardfr.git

# Add all project files
git add .
git status

# Commit
git commit -m "Analytics Dashboard - initial commit"

# Push (use main or master)
git branch -M main
git push -u origin main

Write-Host "Done! If push failed, you may need to authenticate."
