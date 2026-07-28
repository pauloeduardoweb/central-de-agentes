import React, { useState, useEffect, useRef } from 'react';
import { User, X, CheckCircle2, AlertCircle, ShieldAlert, Loader2, Camera, Trash2, Upload } from 'lucide-react';
import { StudentProfileService } from '../../services/StudentProfileService';
import { UserAvatar } from '../common/UserAvatar';
import { processProfileImage } from '../../utils/imageUtils';

interface EditProfileModalProps {
  currentUsername: string;
  currentAvatar?: string | null;
  onClose: () => void;
  onProfileUpdated: (newUsername: string, newAvatar?: string | null) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  currentUsername,
  currentAvatar = null,
  onClose,
  onProfileUpdated,
}) => {
  const [username, setUsername] = useState<string>(currentUsername);
  const [avatar, setAvatar] = useState<string | null>(currentAvatar || null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checkReason, setCheckReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!username || username.trim() === currentUsername) {
      setIsAvailable(null);
      setCheckReason('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      const res = await StudentProfileService.checkUsername(username);
      setIsChecking(false);
      setIsAvailable(res.available);
      setCheckReason(res.reason || '');
    }, 300);

    return () => clearTimeout(timer);
  }, [username, currentUsername]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    setIsCompressing(true);

    try {
      const processed = await processProfileImage(file);
      setAvatar(processed);
    } catch (err: any) {
      setAvatarError(err?.message || 'Erro ao carregar a imagem.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setAvatar(null);
    setAvatarError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    const hasUsernameChanged = username.trim() !== currentUsername;
    const hasAvatarChanged = avatar !== currentAvatar;

    if (!hasUsernameChanged && !hasAvatarChanged) {
      onClose();
      return;
    }

    if (hasUsernameChanged && (!username || username.trim().length < 3)) {
      setSubmitError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }

    if (hasUsernameChanged && isAvailable === false) {
      setSubmitError(checkReason || 'Este nome de usuário não está disponível.');
      return;
    }

    setIsSubmitting(true);
    const res = await StudentProfileService.updateUsername(username.trim(), avatar);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Perfil atualizado com sucesso!');
      onProfileUpdated(username.trim(), res.avatar !== undefined ? res.avatar : avatar);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setSubmitError(res.message || 'Não foi possível atualizar seu perfil.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/50 p-6 md:p-8 shadow-2xl shadow-cyan-950/80 text-white relative space-y-6 my-auto">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <User className="w-6 h-6" />
          </div>

          <h3 className="text-xl font-black text-white">Editar Perfil</h3>
          <p className="text-xs text-slate-300 max-w-xs mx-auto">
            Atualize sua foto de perfil ou altere seu nome de usuário (limitado a 1 vez a cada 30 dias).
          </p>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <label className="text-xs font-bold text-slate-200">Foto de Perfil</label>

          <div className="relative group">
            <UserAvatar username={username || currentUsername} avatarUrl={avatar} size="xl" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="absolute bottom-0 right-0 p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md transition-all cursor-pointer border border-cyan-300"
              title="Alterar Foto"
            >
              {isCompressing ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-cyan-500/30"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Alterar Foto</span>
            </button>

            {avatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer border border-rose-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Foto</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center font-medium">
            Formatos aceitos: JPG, JPEG, PNG, WEBP (Máx: 5 MB).
          </p>

          {avatarError && (
            <p className="text-[11px] font-semibold text-rose-400 text-center">
              {avatarError}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>Nome de usuário</span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">3 - 20 caracteres</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white text-sm font-semibold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />

              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                {isChecking && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                )}
                {!isChecking && username !== currentUsername && isAvailable === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {!isChecking && username !== currentUsername && isAvailable === false && (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>

            {!isChecking && username !== currentUsername && isAvailable === true && (
              <p className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Nome de usuário disponível!</span>
              </p>
            )}
            {!isChecking && username !== currentUsername && isAvailable === false && checkReason && (
              <p className="text-[11px] font-semibold text-rose-400 flex items-center space-x-1">
                <ShieldAlert className="w-3 h-3" />
                <span>{checkReason}</span>
              </p>
            )}
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isChecking || isCompressing || (username !== currentUsername && isAvailable === false)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
