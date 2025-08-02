// Central list of supported off-chain task types

export const TASK_TYPES = [
  {
    type: "twitter_follow",
    label: "Follow on Twitter",
    placeholder: "@username",
    icon: "Twitter"
  },
  {
    type: "twitter_like",
    label: "Like post on Twitter",
    placeholder: "https://twitter.com/...",
    icon: "Heart"
  },
  {
    type: "twitter_retweet",
    label: "Retweet campaign tweet",
    placeholder: "https://twitter.com/...",
    icon: "Repeat"
  },
  {
    type: "join_discord",
    label: "Join Discord server",
    placeholder: "https://discord.gg/...",
    icon: "MessageCircle"
  },
  {
    type: "join_telegram",
    label: "Join Telegram group",
    placeholder: "https://t.me/...",
    icon: "Send"
  },
  {
    type: "telegram_join",
    label: "Join our Telegram",
    placeholder: "https://t.me/...",
    icon: "Send"
  },
  {
    type: "submit_email",
    label: "Submit verified email",
    placeholder: "your@email.com",
    icon: "Mail"
  },
  {
    type: "youtube_sub",
    label: "Subscribe to YouTube channel",
    placeholder: "https://youtube.com/@...",
    icon: "Play"
  }
];

export const TASK_TYPE_MAPPINGS = {
  TWITTER_FOLLOW: 'twitter_follow',
  TWITTER_LIKE: 'twitter_like',
  TWITTER_RETWEET: 'twitter_retweet',
  DISCORD_JOIN: 'join_discord',
  TELEGRAM_JOIN: 'join_telegram',
  EMAIL_SUBMIT: 'submit_email',
  YOUTUBE_SUBSCRIBE: 'youtube_sub',
} as const;

export type SupportedTaskType = typeof TASK_TYPE_MAPPINGS[keyof typeof TASK_TYPE_MAPPINGS];