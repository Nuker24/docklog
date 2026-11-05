"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userError, setUserError] = useState("");
  const [passError, setPassError] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "fail"; message: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);

    const uOk = username.trim().length > 0;
    const pOk = password.length > 0;
    setUserError(uOk ? "" : "Enter your username.");
    setPassError(pOk ? "" : "Enter your password.");
    if (!uOk || !pOk) return;

    setPending(true);
    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setStatus({
          kind: "fail",
          message: "Invalid username or password.",
        });
        setPending(false);
        return;
      }

      setStatus({ kind: "ok", message: "Signed in. Redirecting…" });
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setStatus({
        kind: "fail",
        message: "Something went wrong. Try again.",
      });
      setPending(false);
    }
  }

  return (
    <form id="signin" noValidate onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="username">Username</label>
        <div className="input-wrap">
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            spellCheck={false}
            value={username}
            className={userError ? "is-invalid" : undefined}
            onChange={(e) => {
              setUsername(e.target.value);
              if (userError && e.target.value.trim()) setUserError("");
              setStatus(null);
            }}
          />
        </div>
        <p className={`err${userError ? " show" : ""}`} role="alert">
          {userError}
        </p>
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="input-wrap">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className={`has-toggle${passError ? " is-invalid" : ""}`}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passError && e.target.value) setPassError("");
              setStatus(null);
            }}
          />
          <button
            type="button"
            className="toggle-vis"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p className={`err${passError ? " show" : ""}`} role="alert">
          {passError}
        </p>
      </div>

      <div className="row-meta">
        <a
          className="forgot"
          href="#"
          onClick={(e) => e.preventDefault()}
        >
          Forgot password?
        </a>
      </div>

      <button type="submit" className="cta" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div
        className={`status${status ? ` ${status.kind} show` : ""}`}
        role="status"
        aria-live="polite"
      >
        {status?.message}
      </div>
    </form>
  );
}
