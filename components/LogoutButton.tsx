"use client";

import { useActionState } from "react";
import { LogOut } from "lucide-react";
import { signOut, type AuthActionState } from "@/app/auth/actions";

const initialState: AuthActionState = {};

export function LogoutButton({ className }: { className: string }) {
  const [state, action, pending] = useActionState(signOut, initialState);

  return (
    <>
      <form action={action} className="auth-logout-form">
        <button className={className} disabled={pending} type="submit">
          <LogOut size={16} />
          {pending ? "Виходимо…" : "Вийти"}
        </button>
      </form>
      {state.error && <p className="auth-logout-error" role="alert">{state.error}</p>}
    </>
  );
}
