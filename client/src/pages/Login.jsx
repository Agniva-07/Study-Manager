import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../api";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", form);
      login(res.data);
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#0a0f2c] to-[#020617]">

  <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.25)] p-10 w-[380px]">

    <h2 className="text-3xl font-bold text-white text-center mb-2">
      Welcome Back
    </h2>

    <p className="text-gray-400 text-center mb-6 text-sm">
      Continue your flow ⚡
    </p>

    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      <input
        type="email"
        name="email"
        autoComplete="off"
        placeholder="Email"
        onChange={handleChange}
        className="bg-white/10 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-purple-500 outline-none transition"
      />

      <input
        type="password"
        name="password"
        autoComplete="new-password"
        placeholder="Password"
        onChange={handleChange}
        className="bg-white/10 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-purple-500 outline-none transition"
      />

      <button
        type="submit"
        className="bg-gradient-to-r from-purple-600 to-blue-600 py-3 rounded-xl text-white font-medium hover:scale-[1.02] transition"
      > 
        Login
      </button>

    </form>

    <p className="text-gray-400 text-sm text-center mt-6">
      New here?{" "}
      <span
        onClick={() => navigate("/signup")}
        className="text-purple-400 cursor-pointer hover:underline"
      >
        Create account
      </span>
    </p>

  </div>
</div>
  );
};

export default Login;