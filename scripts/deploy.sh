#!/bin/bash

# ==============================================
# Blooming Beginnings - Deployment Script
# ==============================================

echo "🌱 Blooming Beginnings Deployment"
echo "=================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Step 1: Build check
echo ""
echo "📦 Step 1: Checking build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi
echo "✅ Build successful!"

# Step 2: Deploy to Vercel
echo ""
echo "🚀 Step 2: Deploying to Vercel..."
echo ""
echo "Choose deployment type:"
echo "  1) Preview (staging)"
echo "  2) Production"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "2" ]; then
    vercel --prod
else
    vercel
fi

echo ""
echo "=================================="
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Go to Vercel Dashboard → Storage → Create Postgres database"
echo "  2. Run 'npm run db:push' to create tables"
echo "  3. Set environment variables in Vercel Dashboard"
echo "  4. Register app at developer.worldcoin.org"
echo "  5. Test with World App!"
echo ""
echo "🔗 Your mini app link will be:"
echo "   https://worldcoin.org/mini-app?app_id=YOUR_APP_ID"
echo ""
