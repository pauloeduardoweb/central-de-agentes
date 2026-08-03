import React from 'react';

export const MessageListSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="flex items-end space-x-2">
        <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
        <div className="w-48 h-12 rounded-2xl bg-slate-800/80" />
      </div>
      <div className="flex items-end justify-end space-x-2">
        <div className="w-64 h-16 rounded-2xl bg-emerald-950/40" />
      </div>
      <div className="flex items-end space-x-2">
        <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
        <div className="w-56 h-14 rounded-2xl bg-slate-800/80" />
      </div>
      <div className="flex items-end justify-end space-x-2">
        <div className="w-40 h-10 rounded-2xl bg-emerald-950/40" />
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-16 h-16 rounded-full bg-slate-800" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="h-3 w-20 bg-slate-800/60 rounded" />
        </div>
      </div>
      <div className="h-10 bg-slate-800/60 rounded-xl" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-800/80 rounded w-full" />
        <div className="h-3 bg-slate-800/60 rounded w-4/5" />
      </div>
    </div>
  );
};

export const RankingSkeleton: React.FC = () => {
  return (
    <div className="p-3 space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-3 p-2.5 rounded-xl bg-[#182229]">
          <div className="w-6 h-6 rounded-full bg-slate-800" />
          <div className="w-10 h-10 rounded-full bg-slate-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-28 bg-slate-800 rounded" />
            <div className="h-2.5 w-16 bg-slate-800/60 rounded" />
          </div>
          <div className="h-5 w-14 bg-slate-800/80 rounded-full" />
        </div>
      ))}
    </div>
  );
};

export const GallerySkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="aspect-square bg-slate-800/80 rounded-xl" />
      ))}
    </div>
  );
};

export const MembersSkeleton: React.FC = () => {
  return (
    <div className="p-3 space-y-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center space-x-3 p-2 rounded-xl bg-[#182229]">
          <div className="w-8 h-8 rounded-full bg-slate-800" />
          <div className="h-3.5 w-24 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
};
