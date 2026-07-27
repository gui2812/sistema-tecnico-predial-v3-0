import { Eye, Lock, LogIn, ShieldCheck, User, KeyRound, X } from 'lucide-react';
import { useState } from 'react';
import BuildingLogo from '../components/BuildingLogo';
import { loginComSupabase } from '../services/authService';

export default function Login({ onLogin }) {

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Recuperação de senha
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false);
  const [usuarioRecuperacao, setUsuarioRecuperacao] = useState('');
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState('');



  async function entrar(e) {

    e.preventDefault();

    setErro('');
    setCarregando(true);

    try {

      const resultado = await loginComSupabase(
        usuario.trim(),
        senha.trim()
      );


      if (!resultado?.sucesso) {

        setErro(
          resultado?.erro || 
          'Usuário ou senha incorretos.'
        );

        return;

      }


      onLogin(resultado.usuario);


    } catch (error) {

      console.error(error);

      setErro(
        'Erro ao conectar com o banco de dados.'
      );

    } finally {

      setCarregando(false);

    }

  }



  function solicitarSenha(){

    if(!usuarioRecuperacao.trim()){

      setMensagemRecuperacao(
        'Digite seu usuário.'
      );

      return;

    }


    // futuramente enviaremos para Supabase
    console.log(
      'Solicitação de senha:',
      usuarioRecuperacao
    );


    setMensagemRecuperacao(
      'Solicitação enviada ao administrador.'
    );


    setTimeout(()=>{

      setMostrarRecuperacao(false);
      setUsuarioRecuperacao('');
      setMensagemRecuperacao('');

    },2000);


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



      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">


        <div className="w-full max-w-md md:max-w-lg">


          <div className="bg-white/95 text-slate-950 rounded-[2rem] shadow-2xl border border-white/80 p-7 md:p-10 backdrop-blur">



            <div className="text-center mb-8">


              <div className="mx-auto mb-4 w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-slate-100 flex items-center justify-center shadow-sm">

                <BuildingLogo size={74}/>

              </div>



              <h1 className="text-3xl md:text-4xl font-black">

                Sistema Técnico Predial

              </h1>



              <p className="text-xl md:text-2xl font-bold text-teal-500 mt-1">

                Edifício JK 1455

              </p>


              <div className="flex items-center gap-3 my-5">

                <div className="h-px flex-1 bg-slate-200"/>

                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">

                  <Lock size={17}/>

                </div>

                <div className="h-px flex-1 bg-slate-200"/>

              </div>


              <p className="text-slate-500">

                Acesse o painel técnico do edifício.

              </p>


            </div>





            <form onSubmit={entrar} className="space-y-5">


              <div>


                <label className="text-sm font-bold text-slate-700">

                  Usuário

                </label>



                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">


                  <User size={21} className="text-slate-400"/>



                  <input

                    value={usuario}

                    onChange={(e)=>setUsuario(e.target.value)}

                    className="w-full outline-none bg-transparent"

                    placeholder="Digite seu usuário"

                  />


                </div>


              </div>





              <div>


                <label className="text-sm font-bold text-slate-700">

                  Senha

                </label>



                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">


                  <Lock size={21} className="text-slate-400"/>


                  <input

                    type={mostrarSenha ? 'text':'password'}

                    value={senha}

                    onChange={(e)=>setSenha(e.target.value)}

                    className="w-full outline-none bg-transparent"

                    placeholder="Digite sua senha"

                  />



                  <button

                    type="button"

                    onClick={()=>setMostrarSenha(!mostrarSenha)}

                  >

                    <Eye size={21}/>

                  </button>


                </div>


                <div className="text-right mt-2">

                  <button

                    type="button"

                    onClick={()=>setMostrarRecuperacao(true)}

                    className="text-sm text-blue-600 hover:underline"

                  >

                    Esqueci minha senha

                  </button>

                </div>


              </div>





              {erro && (

                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">

                  {erro}

                </div>

              )}






              <button

                disabled={carregando}

                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-bold text-lg flex items-center justify-center gap-2"

              >

                <LogIn size={20}/>

                {carregando ? 'Entrando...' : 'Entrar'}

              </button>



            </form>





            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">

              <ShieldCheck size={18} className="text-teal-500"/>

              Acesso seguro e exclusivo para usuários autorizados.

            </div>



          </div>


        </div>


      </div>






      {/* MODAL RECUPERAÇÃO DE SENHA */}

      {mostrarRecuperacao && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">


          <div className="bg-white text-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">


            <div className="flex justify-between items-center mb-5">


              <h2 className="text-xl font-bold flex items-center gap-2">

                <KeyRound/>

                Recuperar senha

              </h2>


              <button

                onClick={()=>setMostrarRecuperacao(false)}

              >

                <X/>

              </button>


            </div>



            <p className="text-sm text-slate-500 mb-4">

              Informe seu usuário. O administrador receberá uma solicitação para redefinir sua senha.

            </p>




            <input

              className="w-full border rounded-xl p-3"

              placeholder="Digite seu usuário"

              value={usuarioRecuperacao}

              onChange={(e)=>setUsuarioRecuperacao(e.target.value)}

            />




            {mensagemRecuperacao && (

              <div className="mt-3 text-sm text-blue-600 font-semibold">

                {mensagemRecuperacao}

              </div>

            )}






            <button

              onClick={solicitarSenha}

              className="w-full mt-5 bg-blue-600 text-white py-3 rounded-xl font-bold"

            >

              Solicitar nova senha

            </button>



          </div>


        </div>

      )}



    </div>

  );

}
