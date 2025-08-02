import { TaskVerificationRequest, TaskVerificationResponse } from '../types';

export class TaskVerificationAPI {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:4000', timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async verifyTask(request: TaskVerificationRequest): Promise<TaskVerificationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/tasks/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  async verifyTwitterFollow(username: string, userAddress: string): Promise<TaskVerificationResponse> {
    return this.verifyTask({
      task: {
        type: 'twitter_follow',
        data: { username }
      },
      userAddress
    });
  }

  async verifyTwitterLike(tweetUrl: string, userAddress: string): Promise<TaskVerificationResponse> {
    return this.verifyTask({
      task: {
        type: 'twitter_like',
        data: { tweetUrl }
      },
      userAddress
    });
  }

  async verifyTwitterRetweet(tweetUrl: string, userAddress: string): Promise<TaskVerificationResponse> {
    return this.verifyTask({
      task: {
        type: 'twitter_retweet',
        data: { tweetUrl }
      },
      userAddress
    });
  }

  async verifyDiscordJoin(inviteUrl: string, userAddress: string): Promise<TaskVerificationResponse> {
    return this.verifyTask({
      task: {
        type: 'discord_join',
        data: { inviteUrl }
      },
      userAddress
    });
  }

  async verifyTelegramJoin(channelUrl: string, userAddress: string): Promise<TaskVerificationResponse> {
    return this.verifyTask({
      task: {
        type: 'telegram_join',
        data: { channelUrl }
      },
      userAddress
    });
  }

  async verifyEmail(email: string, userAddress: string): Promise<TaskVerificationResponse> {
    return this.verifyTask({
      task: {
        type: 'email_submit',
        data: { email }
      },
      userAddress
    });
  }

  async verifyYouTubeSubscribe(channelUrl: string, userAddress: string): Promise<TaskVerificationResponse> {
    return this.verifyTask({
      task: {
        type: 'youtube_sub',
        data: { channelUrl }
      },
      userAddress
    });
  }
}

// Mock API for development/testing
export class MockTaskVerificationAPI extends TaskVerificationAPI {
  async verifyTask(request: TaskVerificationRequest): Promise<TaskVerificationResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate success rate (90% success)
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        message: `Task ${request.task.type} verified successfully!`,
        data: {
          verified: true,
          timestamp: Date.now()
        }
      };
    } else {
      return {
        success: false,
        error: `Failed to verify ${request.task.type} task. Please try again.`
      };
    }
  }
}

// Utility function to get the appropriate API instance
export function createTaskAPI(baseUrl?: string, useMock: boolean = false): TaskVerificationAPI {
  if (useMock) {
    return new MockTaskVerificationAPI();
  }
  
  return new TaskVerificationAPI(baseUrl);
}