import React from 'react';

export const GeracaoZProBanner: React.FC = () => {
  const bannerImageUrl = 'https://i.postimg.cc/fbKsZn6b/Captura-de-tela-2026-07-22-173936.png';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 mb-6 shadow-2xl bg-[#030b15] group">
      <img
        src={bannerImageUrl}
        alt="Geração Z Pro — Central de Agentes IA"
        className="w-full h-auto object-cover object-center rounded-2xl block"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
