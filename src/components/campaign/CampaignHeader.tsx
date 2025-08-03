import React from 'react';

interface CampaignHeaderProps {
  title: string;
  description: string;
  status: string;
  timeLeft: string;
  onBack: () => void;
  onJoin: () => void;
  isActive: boolean;
  imageUrl: string;
}

export function CampaignHeader({
  title,
  description,
  status,
  timeLeft,
  onBack,
  onJoin,
  isActive,
  imageUrl,
}: CampaignHeaderProps) {
  const handleJoinClick = () => {
    // Scroll to staking section
    const stakingSection = document.getElementById('staking');
    if (stakingSection) {
      stakingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // If staking section not found, scroll to page bottom where forms usually are
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    onJoin();
  };

  return (
    <div className="max-w-6xl mx-auto my-8">
      <div className="relative w-full h-[380px] sm:h-[420px] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        {/* Full Background Image */}
        <div className="absolute inset-0">
          <img
            src={imageUrl || '/fallback.jpg'}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=600&fit=crop&crop=center';
            }}
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content Overlay Panel */}
        <div className="relative z-10 h-full flex items-center">
          <div className="w-full max-w-lg p-6 sm:p-8 ml-6 sm:ml-8">
            {/* Semi-transparent content background - no blur to keep image crisp */}
            <div className="absolute inset-0 bg-black/70 rounded-xl border border-white/10" />
            
            {/* Content */}
            <div className="relative z-10 space-y-4 text-white">
              {/* Breadcrumbs */}
              <nav className="text-sm text-gray-300">
                <a href="/" onClick={onBack} className="hover:underline hover:text-white transition-colors">Home</a>
                <span className="mx-1">›</span>
                <a href="/campaigns" onClick={onBack} className="hover:underline hover:text-white transition-colors">Campaigns</a>
                <span className="mx-1">›</span>
                <span className="text-white font-semibold">{title}</span>
              </nav>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Active Badge with animated dot */}
                <span className="bg-green-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 border border-green-400/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  Active
                </span>

                {/* Countdown Badge with clock icon */}
                {isActive && (
                  <span className="bg-blue-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 border border-blue-400/20">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8H9V5h2v5z" />
                    </svg>
                    {timeLeft}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-white drop-shadow-lg">
                {title}
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base text-gray-200 leading-relaxed drop-shadow">
                {description || 'Participants can stake SQUDY tokens to win amazing prizes!'}
              </p>

              {/* Join Campaign Button */}
              <div className="pt-2">
                <div className="relative group w-fit">
                  <span className="absolute inset-0 bg-white/10 blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-xl"></span>
                  <button 
                    onClick={handleJoinClick}
                    className="relative z-10 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200 border border-white/20"
                  >
                    🚀 Join Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Gradient Edge Fade (from content area into image) */}
          <div className="absolute inset-y-0 left-0 w-32 sm:w-48 bg-gradient-to-r from-black/20 via-black/10 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}