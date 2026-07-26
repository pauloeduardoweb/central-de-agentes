import React, { useState } from 'react';
import { X, Award, CheckCircle2, Eye, ShieldCheck, Sparkles, ZoomIn, Download } from 'lucide-react';

interface CertificadosModalProps {
  onClose: () => void;
}

interface CertificadoItem {
  id: string;
  title: string;
  milestone: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
  badgeColor: string;
  gradient: string;
  borderColor: string;
}

const CERTIFICADOS: CertificadoItem[] = [
  {
    id: 'cert-100k',
    title: 'CERTIFICADO 100K',
    milestone: '100 MIL',
    description: 'Certificado de Reconhecimento pela conquista de R$ 100.000 em faturamento no Treinamento Geração Z Pro.',
    imageUrl: 'https://i.postimg.cc/63fXFGcy/CERFICADO-100K-Geracao-Z-Pro-OFICIAL.jpg',
    pageUrl: 'https://postimg.cc/2byMZyPD',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    gradient: 'from-cyan-500/20 via-blue-600/20 to-indigo-600/20',
    borderColor: 'border-cyan-500/40 hover:border-cyan-300',
  },
  {
    id: 'cert-250k',
    title: 'CERTIFICADO 250K',
    milestone: '250 MIL',
    description: 'Certificado de Reconhecimento pela meta de R$ 250.000 em faturamento com estratégias do Geração Z Pro.',
    imageUrl: 'https://i.postimg.cc/wvQpns2M/CERFICADO-250K-Geracao-Z-Pro-OFICIAL.jpg',
    pageUrl: 'https://postimg.cc/9R0K70vH',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    gradient: 'from-cyan-500/20 via-blue-600/20 to-indigo-600/20',
    borderColor: 'border-cyan-500/40 hover:border-cyan-300',
  },
  {
    id: 'cert-500k',
    title: 'CERTIFICADO 500K',
    milestone: '500 MIL',
    description: 'Certificado de High-Performance pela meta de R$ 500.000 alcançados no ecossistema Geração Z Pro.',
    imageUrl: 'https://i.postimg.cc/9Mh2xBGL/CERFICADO-500K-Geracao-Z-Pro-OFICIALL.jpg',
    pageUrl: 'https://postimg.cc/8FtxcMXv',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    gradient: 'from-cyan-500/20 via-blue-600/20 to-indigo-600/20',
    borderColor: 'border-cyan-500/40 hover:border-cyan-300',
  },
  {
    id: 'cert-1m',
    title: 'CERTIFICADO 1M',
    milestone: '1 MILHÃO',
    description: 'Certificado Black Diamond por atingir a meta lendária de R$ 1.000.000 em faturamento Geração Z Pro.',
    imageUrl: 'https://i.postimg.cc/26DYHxQf/CERFICADO-1M-Geracao-Z-Pro-OFICIAL.jpg',
    pageUrl: 'https://postimg.cc/06chjDXt',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    gradient: 'from-cyan-500/20 via-blue-600/20 to-indigo-600/20',
    borderColor: 'border-cyan-500/40 hover:border-cyan-300',
  },
];

export const CertificadosModal: React.FC<CertificadosModalProps> = ({ onClose }) => {
  const [selectedCert, setSelectedCert] = useState<CertificadoItem | null>(null);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const handleOpenCertificate = (cert: CertificadoItem) => {
    setSelectedCert(cert);
  };

  const handleImageError = (certId: string) => {
    setImageErrorMap((prev) => ({ ...prev, [certId]: true }));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl my-auto bg-[#040e1a] rounded-3xl border border-cyan-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Blue/Cyan Tech Grid Overlay */}
        <div className="relative p-6 bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 text-white border-b border-cyan-500/30 shrink-0">
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white transition-all cursor-pointer border border-cyan-500/40 z-30 shadow-lg hover:scale-105 active:scale-95"
            aria-label="Fechar Modal"
          >
            <X className="w-5 h-5 text-cyan-300" />
          </button>

          <div className="relative z-10 flex items-center space-x-3.5 mb-2 pr-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-cyan-500/30 border border-cyan-300 shrink-0">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  RECONHECIMENTO & METAS
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Certificados Geração Z Pro
              </h2>
            </div>
          </div>

          <p className="relative z-10 text-xs sm:text-sm text-cyan-100/90 max-w-2xl leading-relaxed font-medium mt-2">
            Acesse e visualize abaixo os Certificados Oficiais de faturamento do Treinamento Geração Z Pro diretamente na ferramenta.
          </p>
        </div>

        {/* Content Body Grid */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {CERTIFICADOS.map((cert) => (
              <div
                key={cert.id}
                className={`relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br ${cert.gradient} bg-[#061527] border ${cert.borderColor} shadow-xl transition-all duration-300 group hover:scale-[1.01]`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cert.badgeColor}`}>
                      🏆 META {cert.milestone}
                    </span>
                    <Award className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
                  </div>

                  <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors flex items-center space-x-2">
                    <span>{cert.title}</span>
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {cert.description}
                  </p>

                  {/* Thumbnail Preview */}
                  <div 
                    onClick={() => handleOpenCertificate(cert)}
                    className="relative w-full h-36 mt-3 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-950/80 cursor-pointer group/thumb flex items-center justify-center"
                  >
                    <img
                      src={cert.imageUrl}
                      alt={cert.title}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/thumb:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 group-hover/thumb:bg-slate-950/20 transition-colors flex items-center justify-center">
                      <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 text-cyan-300 border border-cyan-400/50 text-xs font-bold flex items-center space-x-1.5 shadow-lg group-hover/thumb:scale-110 transition-transform">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Ampliar Certificado</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleOpenCertificate(cert)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-cyan-200" />
                    <span>Visualizar {cert.title} na Ferramenta</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex items-center space-x-3 text-xs text-slate-300">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <p className="leading-relaxed">
              Todos os certificados são emitidos e autenticados pela equipe do treinamento <strong className="text-white">Geração Z Pro</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 100% In-App Certificate Visualizer Modal (Sem redirecionamento externo) */}
      {selectedCert && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-3 sm:p-6"
          onClick={() => setSelectedCert(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[92vh] bg-[#030a14] rounded-3xl border border-cyan-500/60 shadow-2xl overflow-hidden flex flex-col p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 shrink-0 pr-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                    CERTIFICADO OFICIAL - GERAÇÃO Z PRO
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {selectedCert.title} (META {selectedCert.milestone})
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all border border-cyan-500/40 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              >
                <X className="w-5 h-5 text-cyan-300" />
              </button>
            </div>

            {/* In-App Direct Image Container */}
            <div className="relative flex-1 rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-2 sm:p-4 flex flex-col items-center justify-center overflow-hidden min-h-[350px] sm:min-h-[480px]">
              
              {/* Background watermark */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />

              {/* Directly embedded certificate image frame */}
              <div className="relative z-10 w-full h-full flex items-center justify-center overflow-auto rounded-xl">
                {!imageErrorMap[selectedCert.id] ? (
                  <img
                    src={selectedCert.imageUrl}
                    alt={selectedCert.title}
                    className="max-w-full max-h-[62vh] object-contain rounded-xl shadow-2xl border border-cyan-500/30 bg-slate-950"
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError(selectedCert.id)}
                  />
                ) : (
                  /* Fallback if image load encounters client-side restriction */
                  <iframe
                    src={selectedCert.pageUrl}
                    className="w-full h-[60vh] rounded-xl border border-cyan-500/30 bg-slate-950"
                    title={selectedCert.title}
                  />
                )}
              </div>

              <div className="relative z-10 mt-3 flex items-center justify-center space-x-2 text-xs font-semibold text-cyan-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Documento autenticado do Treinamento Geração Z Pro</span>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800/80 shrink-0">
              <span className="text-slate-400 font-medium hidden sm:inline">
                Exibido diretamente na ferramenta Geração Z Pro
              </span>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="ml-auto py-2 px-5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 font-bold transition-all cursor-pointer"
              >
                Fechar Visualizador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

