import React from 'react';
import { getSafeImageUrl } from '../utils/imageUrl';

export const TechGridBackground: React.FC = () => {
  const localImgUrl = '/assets/fundo-geracao-z-pro.jpg';

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Background Image Layer */}
      <img
        src={localImgUrl}
        alt="Background Grid"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-90"
      />

      {/* Dark gradient vignette overlay to keep text high contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020b12]/60 via-[#01080e]/40 to-[#020b12]/80" />

      {/* Atmospheric Ambient Glows */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

