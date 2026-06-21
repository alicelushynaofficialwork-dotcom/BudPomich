"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Заповніть email і пароль, щоб увійти.");
      return;
    }

    setError("");
    router.push("/dashboard");
  }

  return (
    <form className="auth-form login-form" onSubmit={submitLogin} noValidate>
      <label>
        Email
        <span className="input-wrap">
          <Mail size={18} />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </span>
      </label>

      <label>
        Пароль
        <span className="input-wrap">
          <LockKeyhole size={18} />
          <input
            type="password"
            placeholder="Ваш пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </span>
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="btn btn-primary btn-large" type="submit">
        Увійти <ArrowRight size={18} />
      </button>

      <p className="auth-switch">
        Ще немає профілю? <Link href="/auth/register">Зареєструватися</Link>
      </p>
    </form>
  );
}
