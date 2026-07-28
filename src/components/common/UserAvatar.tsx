import React, { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  username?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const cleanName = (username || 'A').trim();
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : 'A';

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-base',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl',
  };

  const hasImage = Boolean(avatarUrl && !imageError && avatarUrl.trim().length > 0);

  if (hasImage && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={cleanName}
        onError={() => setImageError(true)}
        className={`rounded-2xl object-cover border border-cyan-500/40 shadow-lg shadow-cyan-950/40 flex-shrink-0 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  // Fallback initial badge with Geração Z gradient styling
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 border border-cyan-400/50 shadow-lg shadow-cyan-950/40 flex items-center justify-center font-black text-white uppercase select-none tracking-wider flex-shrink-0 ${sizeClasses[size]} ${className}`}
      title={cleanName}
    >
      {initial || <User className="w-1/2 h-1/2 text-white" />}
    </div>
  );
};
