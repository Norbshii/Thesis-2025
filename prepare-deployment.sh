#!/bin/bash

echo "🚀 Preparing for Render Deployment..."
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git not initialized. Run: git init"
    exit 1
fi

echo "✅ Git repository detected"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Make sure to set environment variables in Render dashboard"
else
    echo "✅ .env file found (remember: don't commit this!)"
fi

echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies installed"
fi

echo ""

# Check if vendor exists
if [ ! -d vendor ]; then
    echo "📦 Installing backend dependencies..."
    composer install
else
    echo "✅ Backend dependencies installed"
fi

echo ""

# Test build
echo "🔨 Testing frontend build..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed. Fix errors before deploying."
    exit 1
fi

echo ""

# Check critical files
echo "📋 Checking deployment files..."

files=("render.yaml" "build.sh" "Procfile" ".env.example" "src/config.js")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ Missing: $file"
    fi
done

echo ""
echo "🎯 Pre-Deployment Checklist:"
echo ""
echo "Before deploying, make sure you have:"
echo "  1. [ ] Pushed code to GitHub"
echo "  2. [ ] Airtable API key and Base ID ready"
echo "  3. [ ] All Airtable table IDs ready"
echo "  4. [ ] Tested app locally"
echo "  5. [ ] Read RENDER_QUICK_START.md"
echo ""
echo "📚 Next steps:"
echo "  1. Commit and push: git add . && git commit -m 'Prepare for deployment' && git push"
echo "  2. Follow: RENDER_QUICK_START.md"
echo ""
echo "Good luck! 🚀"

