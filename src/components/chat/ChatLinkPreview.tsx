import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface ChatLinkPreviewProps {
  url: string;
}

export const ChatLinkPreview: React.FC<ChatLinkPreviewProps> = ({ url }) => {
  let domain = '';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace('www.', '');
  } catch {
    domain = url;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block bg-[#0b141a] hover:bg-[#111b21] border border-slate-700/80 rounded-xl p-2.5 transition-all group overflow-hidden max-w-sm cursor-pointer shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
            <span className="truncate">{domain}</span>
            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {url}
          </p>
        </div>
      </div>
    </a>
  );
};

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
}
