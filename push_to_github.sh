#!/bin/bash
# Run this once from your local machine after extracting the zip.
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username.

REPO_NAME="pi-expert-monorepo"
USERNAME="YOUR_GITHUB_USERNAME"

# 1. Create the repo on GitHub (requires GitHub CLI or curl)
echo "Creating GitHub repo..."
gh repo create "$USERNAME/$REPO_NAME" --public --description "PIExpert Power Supply Design Tool — Tauri desktop + Vue web app" || \
  curl -s -X POST "https://api.github.com/user/repos" \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"PIExpert Power Supply Design Tool\",\"private\":false}"

# 2. Init git and push
cd "$(dirname "$0")"
git init
git add .
git commit -m "Initial commit — PIExpert Design Wizard with Tauri + Vue web app"
git branch -M main
git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
git push -u origin main

echo "Done! Visit: https://github.com/$USERNAME/$REPO_NAME"
