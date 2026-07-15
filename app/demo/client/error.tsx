"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DemoClientError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("Demo client page error:", error.message);
  }, [error]);

  return (
    <main className="demo-client-state">
      <section>
        <p>Демонстраційний режим</p>
        <h1>Сталася помилка</h1>
        <span>Не вдалося відкрити демокабінет. Поверніться до вибору ролі.</span>
        <Link href="/demo">Повернутися до Demo Mode</Link>
      </section>
    </main>
  );
}
