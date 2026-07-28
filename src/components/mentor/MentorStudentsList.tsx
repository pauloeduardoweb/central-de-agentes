import React, { useEffect, useState } from 'react';
import { Users, RefreshCw, Trophy, Shield, CheckCircle2, XCircle, Search } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

interface StudentMentorItem {
  username: string;
  avatar?: string | null;
  maskedCode: string;
  xp: number;
  nivel: number;
  desafiosJogados: number;
  profileCreated: boolean;
}

export const MentorStudentsList: React.FC = () => {
  const [students, setStudents] = useState<StudentMentorItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadStudents = async () => {
    setIsLoading(true);
    setError('');
    try {
      const studentCode = localStorage.getItem('user_student_access_code') || '';
      const sessionId = localStorage.getItem('user_session_id') || '';

      const res = await fetch('/api/mentor/students', {
        headers: {
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
          'x-session-id': sessionId,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Erro ao carregar lista de alunos.');
        return;
      }

      const data = await res.json();
      setStudents(data.students || []);
    } catch (err: any) {
      console.error('MentorStudentsList error:', err);
      setError('Erro de conexão ao buscar alunos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.username.toLowerCase().includes(term) ||
      s.maskedCode.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/40 shadow-2xl text-white space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>VISÃO DO MENTOR</span>
            </div>
            <h2 className="text-xl font-black text-white">Alunos e Perfis Cadastrados</h2>
          </div>
        </div>

        <button
          onClick={loadStudents}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome de usuário ou código mascarado..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Content State */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-cyan-300 font-semibold space-y-2">
          <div className="w-6 h-6 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Carregando dados dos alunos em tempo real...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold">
          {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-1">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-bold text-slate-300">Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                <th className="py-3 px-4">Nome de Usuário</th>
                <th className="py-3 px-4">Chave Mascarada</th>
                <th className="py-3 px-4">Nível</th>
                <th className="py-3 px-4">XP Total</th>
                <th className="py-3 px-4">Desafios Jogados</th>
                <th className="py-3 px-4 text-center">Status Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold">
              {filteredStudents.map((student, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">
                    <div className="flex items-center space-x-2.5">
                      <UserAvatar username={student.username} avatarUrl={student.avatar} size="xs" />
                      <span>{student.username}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-300/80">
                    {student.maskedCode}
                  </td>
                  <td className="py-3 px-4 text-teal-300 font-black">
                    Nível {student.nivel}
                  </td>
                  <td className="py-3 px-4 text-cyan-400 font-mono">
                    {student.xp.toLocaleString('pt-BR')} XP
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {student.desafiosJogados} jogos
                  </td>
                  <td className="py-3 px-4 text-center">
                    {student.profileCreated ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Criado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                        <XCircle className="w-3 h-3 text-amber-400" />
                        <span>Não criado</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
