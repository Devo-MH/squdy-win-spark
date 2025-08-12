import React, { useState } from 'react';
import { TaskChecklist } from '@/components/offchain-verifier/src/components/TaskChecklist';
import { Task } from '@/components/offchain-verifier/src/types';
import { Button } from '@/components/ui/button';

const TasksDemo: React.FC = () => {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  // Demo tasks covering different types
  const demoTasks: Task[] = [
    {
      id: 'twitter-follow-1',
      type: 'twitter_follow',
      label: 'Follow @SqudyOfficial',
      description: 'Follow our official Twitter account for updates',
      targetAccount: 'SqudyOfficial',
      required: true,
      url: 'https://twitter.com/SqudyOfficial'
    },
    {
      id: 'twitter-like-1',
      type: 'twitter_like',
      label: 'Like our latest tweet',
      description: 'Show support by liking our announcement',
      tweetId: '1234567890',
      required: true,
      url: 'https://twitter.com/SqudyOfficial/status/1234567890'
    },
    {
      id: 'telegram-join-1',
      type: 'join_telegram',
      label: 'Join Telegram Community',
      description: 'Join our Telegram channel for discussions',
      value: 'SqudyCommunity',
      required: true,
      url: 'https://t.me/SqudyCommunity'
    },
    {
      id: 'discord-join-1',
      type: 'discord_join',
      label: 'Join Discord Server',
      description: 'Join our Discord for real-time chat',
      value: 'https://discord.gg/squdy',
      required: false,
      url: 'https://discord.gg/squdy'
    },
    {
      id: 'email-submit-1',
      type: 'submit_email',
      label: 'Subscribe to Newsletter',
      description: 'Get the latest updates via email',
      required: false
    },
    {
      id: 'website-visit-1',
      type: 'visit_website',
      label: 'Visit Our Website',
      description: 'Learn more about SQUDY',
      url: 'https://squdy.io',
      required: false
    }
  ];

  const handleTaskChange = (taskId: string, completed: boolean, value?: string) => {
    console.log('Task change:', { taskId, completed, value });
    
    if (completed) {
      setCompletedTasks(prev => [...prev.filter(id => id !== taskId), taskId]);
    } else {
      setCompletedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleJoinSuccess = (result: any) => {
    console.log('Join campaign success:', result);
    // Handle successful campaign join
  };

  const resetDemo = () => {
    setCompletedTasks([]);
  };

  const completeAllTasks = () => {
    setCompletedTasks(demoTasks.map(task => task.id));
  };

  const completionPercentage = Math.round((completedTasks.length / demoTasks.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Offchain Tasks Demo
          </h1>
          <p className="text-gray-600 mb-4">
            Test the offchain verification system with simulation enabled
          </p>
          
          {/* Progress Stats */}
          <div className="bg-white rounded-lg p-4 shadow-sm border mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {completedTasks.length} / {demoTasks.length} tasks
              </span>
              <span className="text-sm font-bold text-blue-600">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Demo Controls */}
          <div className="flex gap-3 justify-center mb-6">
            <Button onClick={resetDemo} variant="outline" size="sm">
              Reset All
            </Button>
            <Button onClick={completeAllTasks} variant="outline" size="sm">
              Complete All
            </Button>
          </div>
        </div>

        {/* Task Checklist */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <TaskChecklist
            tasks={demoTasks}
            completedTasks={completedTasks}
            onTaskChange={handleTaskChange}
            campaignName="SQUDY Demo Campaign"
            rewardAmount="1,000 SQUDY"
            campaignId="demo-campaign"
            onJoinSuccess={handleJoinSuccess}
            enableSimulation={true}
            backendUrl="/api"
            highlightFirstIncompleteTask={true}
          />
        </div>

        {/* Debug Information */}
        <div className="mt-8 bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          <h3 className="text-white font-semibold mb-2">Debug Info:</h3>
          <div>Completed Tasks: [{completedTasks.join(', ')}]</div>
          <div>Total Tasks: {demoTasks.length}</div>
          <div>Simulation Mode: Enabled</div>
          <div>Required Tasks: {demoTasks.filter(t => t.required).length}</div>
          <div>Optional Tasks: {demoTasks.filter(t => !t.required).length}</div>
        </div>

        {/* Feature List */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-3">✅ Implemented Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Twitter follow/like/retweet tasks</li>
              <li>• Telegram channel join verification</li>
              <li>• Discord server join verification</li>
              <li>• Email subscription capture</li>
              <li>• Website visit tracking</li>
              <li>• Simulation mode for testing</li>
              <li>• Real-time progress tracking</li>
              <li>• Responsive design</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-3">🎯 Use Cases</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Social media engagement</li>
              <li>• Community building</li>
              <li>• Email list growth</li>
              <li>• Campaign participation requirements</li>
              <li>• User onboarding flows</li>
              <li>• Airdrop qualification</li>
              <li>• Marketing campaigns</li>
              <li>• User verification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksDemo;