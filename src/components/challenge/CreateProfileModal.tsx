import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, CheckCircle2, AlertCircle, ShieldAlert, Loader2, Camera, Trash2, Upload } from 'lucide-react';
import { StudentProfileService } from '../../services/StudentProfileService';
import { UserAvatar } from '../common/UserAvatar';
import { processProfileImage } from '../../utils/imageUtils';

interface CreateProfileModalProps {
  onProfileCreated: (username: string, avatar?: string | null) => void;
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ onProfileCreated }) => {
  const [username, setUsername] = useState<string>('');
  const [confirmUsername, setConfirmUsername] = useState<string>('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checkReason, setCheckReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced real-time username availability check
  useEffect(() => {
    if (!username || username.trim().length === 0) {
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
  }, [username]);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!username || username.trim().length < 3) {
      setSubmitError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }

    if (username.trim() !== confirmUsername.trim()) {
      setSubmitError('Os nomes de usuário não coincidem.');
      return;
    }

    if (isAvailable === false) {
      setSubmitError(checkReason || 'Este nome de usuário é inválido ou já está em uso.');
      return;
    }

    setIsSubmitting(true);
    const res = await StudentProfileService.createProfile(username.trim(), avatar);
    setIsSubmitting(false);

    if (res.success) {
      onProfileCreated(username.trim(), res.avatar || avatar);
    } else {
      setSubmitError(res.message || 'Erro ao criar perfil. Tente outro nome.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/50 p-6 md:p-8 shadow-2xl shadow-cyan-950/80 text-white relative space-y-6 my-auto">
        
        {/* Glow Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>CONFIGURAÇÃO DE PERFIL</span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Crie seu perfil de jogador
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Escolha seu nome de usuário único e adicione sua foto de perfil para figurar no Ranking da Academia.
          </p>
        </div>

        {/* Profile Picture Upload Section */}
        <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <label className="text-xs font-bold text-slate-200">Foto de Perfil (Opcional)</label>
          
          <div className="relative group">
            <UserAvatar username={username || 'A'} avatarUrl={avatar} size="xl" />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="absolute bottom-0 right-0 p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md transition-all cursor-pointer border border-cyan-300"
              title="Escolher Foto"
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
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{avatar ? 'Alterar Foto' : 'Enviar Foto'}</span>
            </button>

            {avatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center font-medium">
            Formatos: JPG, JPEG, PNG, WEBP (Máx: 5 MB).<br />
            Se não enviar foto, uma inicial com o seu nome será gerada automaticamente.
          </p>

          {avatarError && (
            <p className="text-[11px] font-semibold text-rose-400 text-center">
              {avatarError}
            </p>
          )}
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          
          {/* Nome de usuário */}
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
                placeholder="Ex: LojaDaAna, Carlos_Vendas, MariaVendas"
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />

              {/* Real-time Indicator */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                {isChecking && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                )}
                {!isChecking && isAvailable === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {!isChecking && isAvailable === false && (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>

            {/* Check Feedback Message */}
            {!isChecking && isAvailable === true && (
              <p className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Nome de usuário disponível!</span>
              </p>
            )}
            {!isChecking && isAvailable === false && checkReason && (
              <p className="text-[11px] font-semibold text-rose-400 flex items-center space-x-1">
                <ShieldAlert className="w-3 h-3" />
                <span>{checkReason}</span>
              </p>
            )}
          </div>

          {/* Confirmar Nome de usuário */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200">
              Confirmar nome de usuário
            </label>
            <input
              type="text"
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              placeholder="Digite exatamente o mesmo nome"
              maxLength={20}
              required
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Rules List */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">Regras para o nome:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>Permitido apenas letras, números e underline (_)</li>
              <li>Sem espaços ou símbolos</li>
              <li>Não usar nomes reservados (Mentor, Admin, Suporte, etc.)</li>
              <li>Sua chave de acesso nunca será mostrada publicamente</li>
            </ul>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isChecking || isAvailable === false || isCompressing}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvar Perfil...</span>
              </>
            ) : (
              <span>Confirmar e Entrar na Academia</span>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
