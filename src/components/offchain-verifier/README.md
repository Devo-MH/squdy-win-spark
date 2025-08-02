# OffChain Verifier

A reusable off-chain task verification system for social media engagement campaigns. Originally extracted from the dCampaign project, this package provides React components and utilities for verifying Twitter follows, Discord joins, Telegram joins, email submissions, and more.

## Features

- 🎯 **Multiple Task Types**: Twitter, Discord, Telegram, Email, YouTube
- 🔒 **Secure Verification**: Backend API integration with mock mode for development  
- 🎨 **Customizable UI**: Bring your own components or use defaults
- 📱 **Mobile Friendly**: QR codes for Telegram and deep links
- 🔧 **TypeScript**: Full type safety out of the box
- ⚡ **Lightweight**: Minimal dependencies, tree-shakeable

## Installation

### NPM Package (Recommended)
```bash
npm install @engagefi/offchain-verifier
# or
yarn add @engagefi/offchain-verifier
# or
pnpm add @engagefi/offchain-verifier
```

### Local Development
```bash
# From your project root
pnpm add file:./packages/offchain-verifier
```

## Quick Start

```tsx
import React, { useState } from 'react';
import { TaskChecklist, Task } from '@engagefi/offchain-verifier';

function MyApp() {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const tasks: Task[] = [
    {
      id: 'twitter-follow',
      type: 'twitter_follow',
      label: 'Follow @YourProject',
      targetAccount: 'YourProject',
      required: true
    },
    {
      id: 'discord-join',
      type: 'discord_join',
      label: 'Join Discord Server',
      url: 'https://discord.gg/your-invite',
      required: true
    },
    {
      id: 'telegram-join',
      type: 'join_telegram',
      label: 'Join Telegram Channel',
      url: 'https://t.me/your-channel',
      required: false
    }
  ];

  const handleTaskChange = (taskId: string, completed: boolean) => {
    if (completed && !completedTasks.includes(taskId)) {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  const handleJoinSuccess = (result: any) => {
    console.log('All tasks completed!', result);
  };

  return (
    <TaskChecklist
      tasks={tasks}
      completedTasks={completedTasks}
      onTaskChange={handleTaskChange}
      onJoinSuccess={handleJoinSuccess}
      campaignName="My Campaign"
      rewardAmount="100 USDC"
      enableSimulation={true} // Enable for development
    />
  );
}
```

## Supported Task Types

### Twitter Tasks
- `twitter_follow` - Follow a Twitter account
- `twitter_like` - Like a specific tweet  
- `twitter_retweet` - Retweet a specific tweet

### Social Platform Tasks
- `discord_join` - Join a Discord server
- `join_telegram` - Join a Telegram channel/group
- `submit_email` - Submit and verify email address
- `youtube_sub` - Subscribe to YouTube channel

### Task Configuration

```tsx
const task: Task = {
  id: 'unique-task-id',
  type: 'twitter_follow',
  label: 'Follow @YourProject',
  description: 'Follow our Twitter account for updates',
  targetAccount: 'YourProject',  // For Twitter tasks
  url: 'https://discord.gg/invite', // For Discord/Telegram
  required: true,
  verificationUrl: 'https://api.yourbackend.com/verify' // Optional custom endpoint
};
```

## Components

### TaskChecklist
Main component that renders a complete task verification interface.

```tsx
<TaskChecklist
  tasks={tasks}
  completedTasks={completedTasks}
  onTaskChange={handleTaskChange}
  onJoinSuccess={handleJoinSuccess}
  // Optional props
  campaignName="My Campaign"
  rewardAmount="100 USDC"
  backendUrl="https://api.yourbackend.com"
  enableSimulation={false}
  highlightFirstIncompleteTask={true}
  customTheme={customTheme}
/>
```

### Individual Task Components
Use individual task components for custom layouts:

```tsx
import { TwitterFollowTask, DiscordTask, TelegramTask, EmailTask } from '@engagefi/offchain-verifier';

<TwitterFollowTask
  task={{
    type: 'twitter_follow',
    data: { username: 'YourProject' }
  }}
  userAddress="0x..."
  onStatusChange={(status) => console.log(status)}
  enableMockMode={true}
/>
```

## Customization

### Bring Your Own Components
You can provide your own UI components to match your design system:

```tsx
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

<TwitterFollowTask
  task={task}
  userAddress={userAddress}
  onStatusChange={handleChange}
  Button={Button}
  Card={Card}
  Badge={Badge}
  onToast={(message, type) => toast[type](message)}
/>
```

### Custom Theme
```tsx
const customTheme = {
  colors: {
    primary: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    pending: '#6b7280'
  },
  spacing: {
    cardPadding: '1.5rem',
    taskGap: '1rem'
  }
};

<TaskChecklist customTheme={customTheme} {...otherProps} />
```

## Backend Integration

### API Endpoints
Your backend should implement these endpoints:

```
POST /api/tasks/verify
```

Request body:
```json
{
  "task": {
    "type": "twitter_follow",
    "data": { "username": "YourProject" }
  },
  "userAddress": "0x..."
}
```

Response:
```json
{
  "success": true,
  "message": "Task verified successfully",
  "data": {
    "verified": true,
    "timestamp": 1234567890
  }
}
```

### Using the API Client
```tsx
import { createTaskAPI } from '@engagefi/offchain-verifier';

const api = createTaskAPI('https://api.yourbackend.com');

// Verify a Twitter follow
const result = await api.verifyTwitterFollow('YourProject', userAddress);

// Mock mode for development
const mockAPI = createTaskAPI('', true);
```

## Development Mode

Enable simulation mode for development and testing:

```tsx
<TaskChecklist
  enableSimulation={true}
  // ... other props
/>
```

In simulation mode:
- No real API calls are made
- Tasks are verified by clicking the action buttons
- Perfect for development and demos

## Examples

### Basic Campaign
```tsx
const basicTasks = [
  {
    id: 'follow',
    type: 'twitter_follow' as const,
    label: 'Follow @YourProject',
    targetAccount: 'YourProject',
    required: true
  }
];
```

### Multi-Platform Campaign
```tsx
const multiPlatformTasks = [
  {
    id: 'twitter',
    type: 'twitter_follow' as const,
    label: 'Follow on Twitter',
    targetAccount: 'YourProject',
    required: true
  },
  {
    id: 'discord',
    type: 'discord_join' as const,
    label: 'Join Discord',
    url: 'https://discord.gg/your-invite',
    required: true
  },
  {
    id: 'email',
    type: 'submit_email' as const,
    label: 'Submit Email',
    required: false
  }
];
```

## TypeScript Support

The package is written in TypeScript and provides full type definitions:

```tsx
import type { 
  Task, 
  TaskStatus, 
  TaskChecklistProps,
  TaskVerificationResponse
} from '@engagefi/offchain-verifier';
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License. See [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@engagefi.com
- 💬 Discord: [Join our community](https://discord.gg/engagefi)
- 🐛 Issues: [GitHub Issues](https://github.com/engagefi/offchain-verifier/issues)