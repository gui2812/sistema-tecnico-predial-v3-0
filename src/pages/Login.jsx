import { Eye, Lock, LogIn, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import BuildingLogo from '../components/BuildingLogo';
import { login } from '../services/storageService';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');

  function entrar(e) {
    e.preventDefault();

    const session = login(usuario.trim(), senha.trim());

    if (!session) {
      setErro('Usuário ou senha incorretos.');
      return;
    }

    onLogin(session);
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#164e63_0%,#0f172a_45%,#020617_100%)]" />

      <div className="absolute -left-24 bottom-0 hidden lg:block opacity-60">
        <div className="flex items-end gap-4">
          <div className="w-28 h-72 bg-white/10 rounded-t-[3rem] border border-white/10" />
          <div className="w-36 h-96 bg-cyan-300/15 rounded-t-[4rem] border border-cyan-100/10" />
          <div className="w-28 h-60 bg-white/10 rounded-t-[3rem] border border-white/10" />
          <div className="w-24 h-44 bg-white/10 rounded-t-[2rem] border border-white/10" />
        </div>
      </div>

      <div className="absolute right-10 top-20 w-80 h-80 rounded-full border border-cyan-200/10" />
      <div className="absolute right-32 bottom-24 w-52 h-52 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute left-1/2 top-20 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md md:max-w-lg">
          <div className="bg-white/95 text-slate-950 rounded-[2rem] shadow-2xl border border-white/80 p-7 md:p-10 backdrop-blur">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-slate-100 flex items-center justify-center shadow-sm">
                <BuildingLogo size={74} />
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">
                Sistema Técnico Predial
              </h1>
              <p className="text-xl md:text-2xl font-bold text-teal-500 mt-1">
                Edifício JK 1455
              </p>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Lock size={17} />
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="text-slate-500">
                Acesse o painel técnico do edifício.
              </p>
            </div>

            <form onSubmit={entrar} className="space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-700">Usuário</label>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-400 transition">
                  <User size={21} className="text-slate-400" />
                  <input
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className="w-full outline-none text-base bg-transparent"
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Senha</label>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-400 transition">
                  <Lock size={21} className="text-slate-400" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full outline-none text-base bg-transparent"
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="text-slate-500 hover:text-slate-800"
                    title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <Eye size={21} />
                  </button>
                </div>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-3 text-sm font-semibold">
                  {erro}
                </div>
              )}

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition">
                <LogIn size={20} />
                Entrar
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck size={18} className="text-teal-500" />
              <span>Acesso seguro e exclusivo para usuários autorizados.</span>
            </div>

            <div className="mt-5 text-xs text-slate-400 bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
              Acesso teste: admin/1455 • manutencao/1234 • limpeza/1234 • bms/1234
            </div>
          </div>

          <div className="mt-5 text-center text-xs md:text-sm text-slate-400">
            Versão web • Responsivo para celular e PC
          </div>
        </div>
      </div>
    </div>
  );
}
