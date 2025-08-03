# 🔑 Social Media API Setup Guide

## 🐦 Twitter/X API Setup
**Cost**: $100/month for Basic tier
**Timeline**: 1-2 days approval

### Steps:
1. Apply at [developer.twitter.com](https://developer.twitter.com)
2. Create new app for "Campaign verification"
3. Get Bearer Token for API v2
4. Test with `/2/users/by/username/{username}` endpoint

### Environment Variables:
```env
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

## 🎮 Discord Bot Setup
**Cost**: Free
**Timeline**: 30 minutes

### Steps:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. Go to "Bot" section, create bot
4. Copy bot token
5. Enable required permissions: "Read Message History", "View Channels"

### Environment Variables:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
```

## 📱 Telegram Bot Setup
**Cost**: Free
**Timeline**: 15 minutes

### Steps:
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command
3. Choose bot name and username
4. Copy the token provided
5. Add bot to your channels as admin

### Environment Variables:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## 🔗 Quick Setup Script
```bash
# Run this after getting your API keys
cp backend/env.example .env
nano .env  # Add your API keys
docker-compose up -d
```

## 🧪 Test Social Integrations
```bash
# Test Twitter API
curl -H "Authorization: Bearer $TWITTER_BEARER_TOKEN" \
  "https://api.twitter.com/2/users/by/username/elonmusk"

# Test Discord (replace GUILD_ID and USER_ID)
curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  "https://discord.com/api/v10/guilds/GUILD_ID/members/USER_ID"

# Test Telegram (replace CHAT_ID and USER_ID)
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getChatMember?chat_id=CHAT_ID&user_id=USER_ID"
```