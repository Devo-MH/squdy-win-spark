const axios = require('axios');

class SocialVerificationService {
  constructor() {
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.discordBotToken = process.env.DISCORD_BOT_TOKEN;
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  async verifyTwitterFollow(username, targetAccount) {
    try {
      if (!this.twitterBearerToken) {
        throw new Error('Twitter API credentials not configured');
      }

      // Get user ID by username
      const userResponse = await axios.get(
        `https://api.twitter.com/2/users/by/username/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${this.twitterBearerToken}`,
          },
        }
      );

      const userId = userResponse.data.data.id;

      // Check if user follows target account
      const followingResponse = await axios.get(
        `https://api.twitter.com/2/users/${userId}/following`,
        {
          headers: {
            'Authorization': `Bearer ${this.twitterBearerToken}`,
          },
          params: {
            'user.fields': 'username',
            'max_results': 1000,
          },
        }
      );

      const isFollowing = followingResponse.data.data?.some(
        user => user.username.toLowerCase() === targetAccount.toLowerCase()
      );

      return {
        verified: isFollowing,
        data: {
          userId,
          targetAccount,
          followingCount: followingResponse.data.meta?.result_count || 0,
        },
      };
    } catch (error) {
      console.error('Twitter verification error:', error.response?.data || error.message);
      return {
        verified: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async verifyTwitterRetweet(username, tweetId) {
    try {
      if (!this.twitterBearerToken) {
        throw new Error('Twitter API credentials not configured');
      }

      // Get user ID by username
      const userResponse = await axios.get(
        `https://api.twitter.com/2/users/by/username/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${this.twitterBearerToken}`,
          },
        }
      );

      const userId = userResponse.data.data.id;

      // Check retweets of the specific tweet
      const retweetResponse = await axios.get(
        `https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`,
        {
          headers: {
            'Authorization': `Bearer ${this.twitterBearerToken}`,
          },
        }
      );

      const hasRetweeted = retweetResponse.data.data?.some(
        user => user.id === userId
      );

      return {
        verified: hasRetweeted,
        data: {
          userId,
          tweetId,
          retweetCount: retweetResponse.data.meta?.result_count || 0,
        },
      };
    } catch (error) {
      console.error('Twitter retweet verification error:', error.response?.data || error.message);
      return {
        verified: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async verifyDiscordMembership(userId, guildId) {
    try {
      if (!this.discordBotToken) {
        throw new Error('Discord bot token not configured');
      }

      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
        {
          headers: {
            'Authorization': `Bot ${this.discordBotToken}`,
          },
        }
      );

      return {
        verified: true,
        data: {
          userId,
          guildId,
          joinedAt: response.data.joined_at,
          roles: response.data.roles,
        },
      };
    } catch (error) {
      console.error('Discord verification error:', error.response?.data || error.message);
      return {
        verified: false,
        error: error.response?.status === 404 ? 'User not found in server' : error.message,
      };
    }
  }

  async verifyTelegramMembership(userId, chatId) {
    try {
      if (!this.telegramBotToken) {
        throw new Error('Telegram bot token not configured');
      }

      const response = await axios.get(
        `https://api.telegram.org/bot${this.telegramBotToken}/getChatMember`,
        {
          params: {
            chat_id: chatId,
            user_id: userId,
          },
        }
      );

      const member = response.data.result;
      const isActive = ['member', 'administrator', 'creator'].includes(member.status);

      return {
        verified: isActive,
        data: {
          userId,
          chatId,
          status: member.status,
          joinDate: member.join_date,
        },
      };
    } catch (error) {
      console.error('Telegram verification error:', error.response?.data || error.message);
      return {
        verified: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async verifyEmailSubscription(email, listId) {
    // Placeholder for email verification
    // This would integrate with your email service provider (Mailchimp, SendGrid, etc.)
    return {
      verified: true,
      data: {
        email,
        listId,
        subscribedAt: new Date().toISOString(),
      },
    };
  }

  async verifyWebsiteVisit(sessionId, targetUrl) {
    // Placeholder for website visit verification
    // This would integrate with analytics or tracking system
    return {
      verified: true,
      data: {
        sessionId,
        targetUrl,
        visitedAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = new SocialVerificationService();