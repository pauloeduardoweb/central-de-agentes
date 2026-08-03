// Deterministic color palette for nicknames without avatars
const AVATAR_GRADIENTS = [
  'from-emerald-600 to-teal-800 text-white border-emerald-400/50',
  'from-cyan-600 to-blue-800 text-white border-cyan-400/50',
  'from-purple-600 to-indigo-800 text-white border-indigo-400/50',
  'from-amber-600 to-orange-800 text-white border-amber-400/50',
  'from-rose-600 to-pink-800 text-white border-rose-400/50',
  'from-violet-600 to-fuchsia-800 text-white border-violet-400/50',
  'from-lime-600 to-emerald-800 text-white border-lime-400/50',
  'from-sky-600 to-cyan-800 text-white border-sky-400/50',
];

export function getAvatarGradient(nickname: string = 'Aluno'): string {
  if (!nickname) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export function getNicknameInitials(nickname: string = 'Aluno'): string {
  if (!nickname) return 'A';
  const parts = nickname.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nickname.slice(0, 2).toUpperCase();
}
