# 🤖 Free Social Bots Setup (5 Minutes)

## 🎮 Discord Bot Setup

### **Step 1: Create Discord Bot**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" → Name: "Squdy Verifier"
3. Go to "Bot" tab → Click "Add Bot"
4. **Copy Bot Token** (save this!)
5. Enable "Message Content Intent"

### **Step 2: Add Bot to Server**
1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Read Message History`, `Send Messages`
4. Copy generated URL and add bot to your Discord server

### **Demo Discord Server for Testing**
- Server Name: "Squdy Demo"
- Invite Link: Create a public server for testing
- Test Channel: #general

---

## 📱 Telegram Bot Setup

### **Step 1: Create Telegram Bot**
1. Open Telegram → Search for `@BotFather`
2. Send `/newbot` command
3. Choose name: "Squdy Verifier Bot"
4. Choose username: `@squdyverifier_bot`
5. **Copy Bot Token** (save this!)

### **Step 2: Create Test Channel**
1. Create new Telegram channel: "Squdy Demo"
2. Add your bot as admin
3. Get channel ID using bot API

---

## 🔧 Environment Variables

Add these to your deployment:

```env
# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_test_server_id

# Telegram  
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHANNEL_ID=@squdydemo

# Demo social accounts for testing
DEMO_TWITTER_ACCOUNT=squdyplatform
DEMO_DISCORD_SERVER=123456789
DEMO_TELEGRAM_CHANNEL=@squdydemo
```

---

## 🧪 Test Commands

### **Discord Bot Test**
```bash
curl -H "Authorization: Bot YOUR_BOT_TOKEN" \
  "https://discord.com/api/v10/guilds/YOUR_GUILD_ID/members/YOUR_USER_ID"
```

### **Telegram Bot Test**  
```bash
curl "https://api.telegram.org/bot$YOUR_BOT_TOKEN/getMe"
```

---

## 🎯 Demo Task Examples

### **Discord Tasks**
- ✅ Join Discord server: `discord.gg/squdydemo`
- ✅ React to announcement message
- ✅ Send message in #general

### **Telegram Tasks**
- ✅ Join Telegram channel: `@squdydemo` 
- ✅ Forward announcement message
- ✅ Comment on pinned post

### **Free Social Tasks**
- ✅ Visit website: `squdy.vercel.app`
- ✅ Subscribe to newsletter
- ✅ Download app (mock)

---

## 🚨 Quick Demo Setup

If you want to launch NOW without setting up bots:

```javascript
// Use mock verification (in development)
const useMockSocialVerification = true;

// All tasks auto-complete for demo
if (useMockSocialVerification) {
  return { verified: true, message: "Demo mode - auto verified!" };
}
```

---

## 🔗 Useful Links

- **Discord Dev Portal**: https://discord.com/developers/applications
- **Telegram BotFather**: https://t.me/botfather  
- **Discord.js Guide**: https://discordjs.guide/
- **Telegram Bot API**: https://core.telegram.org/bots/api

**Time to complete: 5-10 minutes** ⏱️