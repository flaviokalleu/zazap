import React, { useState, useContext, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Helmet } from "react-helmet";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import axios from "axios"; // Adicionado para requisições ao backend

const Login = () => {
  const { handleLogin } = useContext(AuthContext);
  const [user, setUser] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isUserCreationEnabled, setIsUserCreationEnabled] = useState(true);

  // Buscar o status de criação de usuário do backend
  useEffect(() => {
    const fetchUserCreationStatus = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8081";
        const response = await axios.get(`${backendUrl}/public-settings/userCreation`);
        setIsUserCreationEnabled(response.data.userCreation === "enabled");
      } catch (err) {
        console.error("Erro ao buscar status:", err);
        setIsUserCreationEnabled(false); // Padrão em caso de erro
      }
    };
    fetchUserCreationStatus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(user);
  };

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>

      <div className="relative w-screen h-screen bg-gray-50 overflow-hidden flex md:flex-row flex-col">
        {/* Fundo com partículas sutis */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-float top-20 left-20"></div>
          <div className="absolute w-80 h-80 bg-gray-200/20 rounded-full blur-3xl animate-float-delayed bottom-32 right-32"></div>
        </div>

        {/* Lado da imagem */}
        <div
          className="flex-1 bg-cover bg-center relative md:h-full h-[30vh] transition-all duration-500"
          style={{ backgroundImage: "url('https://wallpapercave.com/wp/wp12255781.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent flex items-center justify-center">
            <h1 className="text-white text-4xl md:text-5xl font-bold tracking-wide drop-shadow-2xl animate-fade-in">
              Bem-vindo!
            </h1>
          </div>
        </div>

        {/* Lado do formulário */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="block mx-auto mb-8 max-w-[160px] h-auto drop-shadow-md animate-bounce-slow"
            />

            {error && (
              <p className="text-red-600 text-center mb-6 text-sm font-semibold tracking-wide bg-red-50 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Campo de Email */}
            <div className="mb-6 relative group">
              <label className="block text-gray-700 font-semibold mb-2 tracking-wide">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors duration-300" />
                </span>
                <input
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 placeholder-gray-400 outline-none transition-all duration-300 hover:bg-gray-100"
                  placeholder="Digite seu email"
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div className="mb-6 relative group">
              <label className="block text-gray-700 font-semibold mb-2 tracking-wide">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors duration-300" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={user.password}
                  onChange={(e) => setUser({ ...user, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 placeholder-gray-400 outline-none transition-all duration-300 hover:bg-gray-100"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500 hover:text-blue-500 transition-colors duration-300" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500 hover:text-blue-500 transition-colors duration-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Lembrar de mim */}
            <div className="flex items-center mb-8">
              <input
                type="checkbox"
                checked={user.remember}
                onChange={(e) => setUser({ ...user, remember: e.target.checked })}
                className="w-4 h-4 text-blue-500 bg-gray-50 border-gray-300 rounded focus:ring-blue-400 focus:ring-2"
              />
              <label className="ml-2 text-gray-700 text-sm font-semibold tracking-wide">
                Lembrar de mim
              </label>
            </div>

            {/* Botões */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl py-3 font-semibold text-base shadow-lg shadow-blue-500/40 transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 active:scale-95"
            >
              Entrar
            </button>
            {isUserCreationEnabled && (
              <RouterLink to="/signup">
                <button
                  className="w-full mt-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl py-3 font-semibold text-base shadow-lg shadow-green-500/40 transition-all duration-300 hover:from-green-600 hover:to-green-700 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)] hover:-translate-y-0.5 active:scale-95"
                >
                  Cadastre-se
                </button>
              </RouterLink>
            )}

            {/* Esqueceu a senha */}
            <div className="mt-6 text-center">
              <RouterLink
                to="/forgot-password"
                className="text-blue-500 font-semibold hover:text-blue-700 hover:underline transition-all duration-300"
              >
                Esqueceu a senha?
              </RouterLink>
            </div>
          </form>
        </div>

        {/* Botão WhatsApp */}
        <div
          onClick={() => window.open("https://wa.me/556196080740")}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full w-16 h-16 flex items-center justify-center shadow-lg shadow-green-500/40 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
        >
          <img
            src="https://i.ibb.co/1p43y88/iconzapzap.png"
            alt="WhatsApp"
            className="w-8 h-8 object-contain drop-shadow-md"
          />
        </div>
      </div>
    </>
  );
};

export default Login;