import React from 'react';
import { getSafeImageUrl } from '../utils/imageUrl';

export const TechGridBackground: React.FC = () => {
  const rawUrl = 'https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png';
  const bgImageUrl = getSafeImageUrl(rawUrl);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Background Image Layer */}
      <img
        src={bgImageUrl}
        alt="Background Grid"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== rawUrl) {
            target.src = rawUrl;
          }
        }}
        className="absolute inset-0 w-full h-full object-cover object-center opacity-90"
        referrerPolicy="no-referrer"
      />

      {/* Dark gradient vignette overlay to keep text high contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020b12]/60 via-[#01080e]/40 to-[#020b12]/80" />

      {/* Atmospheric Ambient Glows */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

