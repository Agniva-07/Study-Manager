import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../api";

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", form);
      login(res.data);
      navigate("/");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#0a0f2c] to-[#020617]">

      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.25)] p-8 w-[360px]">

        <h2 className="text-3xl font-bold text-white text-center mb-2">
            Join FlowState
        </h2>

        <p className="text-gray-400 text-center mb-6 text-sm">
            Build your focus system 🚀
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <input
            type="text"
            name="name"
            placeholder="Name"
            autoComplete="off"
            onChange={handleChange}
            className="bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none"
            required
          />

          <input
            type="email"
            name="email"
            autoComplete="new-email"
            placeholder="Email"
            className="bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none"
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="Password"
            className="bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none"
            onChange={handleChange}
          />

          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg hover:opacity-90 transition"
          >
            {submitting ? "Creating..." : "Sign Up"}
          </button>

        </form>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Already have an account?{" "}
          <span
            className="text-purple-400 cursor-pointer"
            onClick={() => navigate("/")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
};

export default Signup;