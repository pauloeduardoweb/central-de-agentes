import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, User, Phone, Lock, Eye, Check, AlertCircle, FileText, Upload, Trash2, Loader2, ChevronDown, Search } from 'lucide-react';
import { compressAndPrepareAvatar } from '../../utils/chatImageUtils';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  Country,
  parsePhoneInput,
  formatNationalNumber,
  validateInternationalPhone,
  onlyDigits,
} from '../../utils/phoneUtils';

interface ChatProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitProfile: (data: {
    nickname: string;
    photo_url?: string | null;
    phone: string;
    phone_visibility: 'MENTOR_ONLY' | 'MEMBERS';
    accept_rules: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  onUploadAvatar?: (file: File) => Promise<{ success: boolean; photoUrl?: string; error?: string }>;
  initialProfile?: {
    nickname?: string;
    photo_url?: string | null;
    phone?: string;
    phone_visibility?: 'MENTOR_ONLY' | 'MEMBERS';
  } | null;
  isMentor?: boolean;
  isRequiredOnboarding?: boolean;
}

export const ChatProfileModal: React.FC<ChatProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmitProfile,
  onUploadAvatar,
  initialProfile,
  isMentor = false,
  isRequiredOnboarding = false,
}) => {
  const [nickname, setNickname] = useState(initialProfile?.nickname || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialProfile?.photo_url || null);

  // Phone states
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [nationalInput, setNationalInput] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const [phoneVisibility, setPhoneVisibility] = useState<'MENTOR_ONLY' | 'MEMBERS'>(
    initialProfile?.phone_visibility || 'MENTOR_ONLY'
  );
  const [acceptRules, setAcceptRules] = useState(Boolean(initialProfile));
  const [showRulesText, setShowRulesText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialProfile) {
      if (initialProfile.nickname) setNickname(initialProfile.nickname);
      if (initialProfile.photo_url !== undefined) setPhotoUrl(initialProfile.photo_url);
      if (initialProfile.phone) {
        const parsed = parsePhoneInput(initialProfile.phone);
        setSelectedCountry(parsed.country);
        setNationalInput(parsed.formattedNational);
      }
      if (initialProfile.phone_visibility) setPhoneVisibility(initialProfile.phone_visibility);
      setAcceptRules(true);
    }
  }, [initialProfile, isOpen]);

  // Handle clicking outside country dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  // Keyboard navigation & escape handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showCountryDropdown) {
          setShowCountryDropdown(false);
        } else if (!isRequiredOnboarding && isOpen) {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRequiredOnboarding, showCountryDropdown, onClose]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingAvatar(true);

    let tempBlobUrl: string | null = null;
    try {
      tempBlobUrl = URL.createObjectURL(file);
      setPhotoUrl(tempBlobUrl);
    } catch (err) {}

    try {
      const compressed = await compressAndPrepareAvatar(file);

      if (onUploadAvatar) {
        const res = await onUploadAvatar(compressed.file);
        if (res.success && res.photoUrl) {
          if (tempBlobUrl) {
            try { URL.revokeObjectURL(tempBlobUrl); } catch (e) {}
          }
          setPhotoUrl(res.photoUrl);
        } else {
          setError(res.error || 'Não foi possível enviar a foto. Você pode concluir o cadastro sem ela.');
        }
      }
    } catch (err: any) {
      console.warn('[Avatar upload note]:', err);
      setError('Não foi possível enviar a foto. Você pode concluir o cadastro sem ela.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Check if user pasted an international format starting with + or dial code
    if (val.trim().startsWith('+') || (onlyDigits(val).length >= 11 && (val.includes('+') || val.startsWith('55') || val.startsWith('1')))) {
      const parsed = parsePhoneInput(val, selectedCountry);
      setSelectedCountry(parsed.country);
      setNationalInput(parsed.formattedNational);
      return;
    }

    // Normal national typing
    const formatted = formatNationalNumber(selectedCountry, val);
    setNationalInput(formatted);
  };

  const handleCountrySelect = (c: Country) => {
    setSelectedCountry(c);
    setShowCountryDropdown(false);
    setCountrySearch('');
    // Re-format existing national input for new country
    setNationalInput(formatNationalNumber(c, nationalInput));
  };

  const filteredCountries = COUNTRIES.filter((c) => {
    const query = countrySearch.toLowerCase().trim();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.dialCode.includes(query) ||
      c.code.toLowerCase().includes(query)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptRules) {
      setError('Você deve ler e aceitar as regras da comunidade.');
      return;
    }

    if (!nickname.trim() || nickname.trim().length < 3) {
      setError('O Nickname deve conter pelo menos 3 caracteres.');
      return;
    }

    const phoneValidation = validateInternationalPhone(selectedCountry, nationalInput);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Confira o código do país e o número de telefone.');
      return;
    }

    if (uploadingAvatar) {
      setError('Aguarde o envio da foto terminar.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmitProfile({
        nickname: nickname.trim(),
        photo_url: photoUrl,
        phone: phoneValidation.canonicalE164!,
        phone_visibility: phoneVisibility,
        accept_rules: acceptRules,
      });

      if (!result.success) {
        setError(result.error || 'Erro ao registrar perfil.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao conectar com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 ${
        isRequiredOnboarding ? 'bg-[#030a0e]/96 backdrop-blur-md' : 'bg-black/80 backdrop-blur-sm'
      } animate-fade-in`}
      onClick={() => {
        if (!isRequiredOnboarding && !showCountryDropdown) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#0b141a] border border-emerald-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#111b21] via-[#1f2c34] to-[#111b21] p-4 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                {initialProfile && !isRequiredOnboarding
                  ? 'Configurações do Perfil'
                  : 'Perfil na Comunidade Geração Z Pro'}
              </h3>
              <p className="text-emerald-400/80 text-xs">
                {initialProfile && !isRequiredOnboarding
                  ? 'Atualize sua foto e dados de membro'
                  : 'Complete seu cadastro para acessar o Bate-papo'}
              </p>
            </div>
          </div>
          {!isRequiredOnboarding && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-200">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo Avatar Direct Uploader */}
          <div className="bg-[#111b21] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              {photoUrl ? (
                <img
                  src={resolveChatMediaUrl(photoUrl)}
                  alt="Foto do Perfil"
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/60 shadow-md"
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-full border-2 border-slate-700 bg-gradient-to-tr ${getAvatarGradient(
                    nickname || 'Aluno'
                  )} flex items-center justify-center font-bold text-2xl text-white shadow-md`}
                >
                  {getNicknameInitials(nickname || 'Aluno')}
                </div>
              )}

              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <span className="block text-xs font-semibold text-slate-200">Foto de Perfil</span>
              <p className="text-[11px] text-slate-400">
                Selecione uma foto da sua galeria ou tire uma foto com a câmera.
              </p>

              <input
                id="chat-profile-avatar-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <label
                  htmlFor="chat-profile-avatar-input"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
                    uploadingAvatar ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoUrl ? 'Trocar Foto' : 'Escolher Foto'}</span>
                </label>

                {photoUrl && (
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nickname Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Nickname (Nome no Chat) *
              </span>
              <span className="text-[11px] text-slate-500">Ex: PedroGZ, Ana_Pro</span>
            </label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Digite seu nickname exclusivo..."
              maxLength={30}
              className="w-full bg-[#111b21] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Visível para os colegas da mentoria. Mínimo 3 e máximo 30 caracteres. Nomes reservados não são permitidos.
            </p>
          </div>

          {/* International Phone Input with Country Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Número de Telefone (WhatsApp com código de país) *
            </label>

            <div className="relative flex items-center gap-2">
              {/* Country Selector Button */}
              <div className="relative" ref={countryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown((prev) => !prev)}
                  className="bg-[#111b21] border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white flex items-center gap-1.5 hover:border-emerald-500/80 transition-colors cursor-pointer shrink-0"
                >
                  <span className="text-base leading-none">{selectedCountry.flag}</span>
                  <span className="font-medium text-emerald-400 text-xs sm:text-sm">{selectedCountry.dialCode}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Searchable Dropdown Popup */}
                {showCountryDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#111b21] border border-emerald-500/40 rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-fade-in">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        autoFocus
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Pesquisar país ou DDI..."
                        className="w-full bg-[#0b141a] border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {filteredCountries.length === 0 ? (
                        <p className="text-[11px] text-slate-400 p-2 text-center">Nenhum país encontrado</p>
                      ) : (
                        filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleCountrySelect(c)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              c.code === selectedCountry.code
                                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                                : 'hover:bg-slate-800/80 text-slate-200'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span>{c.flag}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="text-emerald-400/90 font-mono text-[11px] shrink-0 ml-1">
                              {c.dialCode}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* National Phone Input */}
              <input
                type="tel"
                required
                value={nationalInput}
                onChange={handlePhoneInputChange}
                placeholder={selectedCountry.example}
                className="flex-1 bg-[#111b21] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <p className="text-[11px] text-slate-400 mt-1">
              Exemplo ({selectedCountry.name}): <strong className="text-emerald-400/90">{selectedCountry.dialCode} {selectedCountry.example}</strong>.
            </p>
          </div>

          {/* Phone Visibility Radio Options */}
          <div className="bg-[#111b21] p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Visibilidade do Telefone
            </span>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="phone_visibility"
                checked={phoneVisibility === 'MENTOR_ONLY'}
                onChange={() => setPhoneVisibility('MENTOR_ONLY')}
                className="accent-emerald-500"
              />
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Apenas para o Mentor Bigode e Administradores (Recomendado)
              </span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="phone_visibility"
                checked={phoneVisibility === 'MEMBERS'}
                onChange={() => setPhoneVisibility('MEMBERS')}
                className="accent-emerald-500"
              />
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-cyan-400" />
                Visível para todos os membros da comunidade
              </span>
            </label>
          </div>

          {/* Rules Acceptance Accordion */}
          <div className="bg-[#111b21] p-3.5 rounded-xl border border-emerald-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-start space-x-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptRules}
                  onChange={(e) => setAcceptRules(e.target.checked)}
                  className="mt-0.5 accent-emerald-500 rounded"
                />
                <span className="font-medium">
                  Concordo e aceito integralmente as <strong className="text-emerald-400">Regras da Comunidade Geração Z Pro</strong>.
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesText(!showRulesText)}
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              {showRulesText ? 'Ocultar termos e diretrizes' : 'Ler regras completas da comunidade'}
            </button>

            {showRulesText && (
              <div className="bg-[#0b141a] p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1.5 max-h-36 overflow-y-auto">
                <p>
                  <strong>1. Respeito Mútuo:</strong> Proibido ofensas, preconceito, xingamentos e atos de discriminação.
                </p>
                <p>
                  <strong>2. Conteúdo Permitido:</strong> Apenas tópicos voltados a marketing digital, criações, TikTok 2K e mentoria.
                </p>
                <p>
                  <strong>3. Anti-Spam:</strong> Proibida a divulgação não autorizada de links, grupos externos, pirataria ou ofertas concorrentes.
                </p>
                <p>
                  <strong>4. Privacidade:</strong> Respeite os dados dos alunos. Não compartilhe contatos privados sem consentimento.
                </p>
                <p>
                  <strong>5. Moderação:</strong> O Mentor Bigode tem autoridade total para advertir, suspender ou banir infratores.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            {!isRequiredOnboarding && (
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || uploadingAvatar || !acceptRules}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {submitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{initialProfile && !isRequiredOnboarding ? 'Salvar Alterações' : 'Concluir Cadastro e Entrar'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
