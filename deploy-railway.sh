#!/bin/bash

echo "🚀 Deploying Squdy Backend to Railway..."

# Login to Railway (will open browser)
echo "📝 Please log in to Railway when prompted..."
railway login

# Create new project or link existing
echo "🔗 Setting up Railway project..."
railway link

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set MONGODB_URI="mongodb+srv://dinabahnasy:wma8hgj_JWD3jbx1gvk@cluster0.d9mxajj.mongodb.net/dcampaign?retryWrites=true&w=majority"
railway variables set NODE_ENV="production"
railway variables set PORT="3001"

# Deploy the backend
echo "🚀 Deploying backend..."
railway up --detach

echo "✅ Deployment complete!"
echo "🔗 Your backend will be available at the Railway URL"
echo "📊 Check deployment status: railway status"
echo "📝 View logs: railway logs"