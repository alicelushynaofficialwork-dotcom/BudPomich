"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DemoMasterError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("Demo master page error:", error.message);
  }, [error]);

  return (
    <main className="demo-master-page-state">
      <section>
        <p>Демонстраційний режим</p>
        <h1>Сталася помилка</h1>
        <span>Не вдалося відкрити демокабінет майстра.</span>
        <Link href="/demo">Повернутися до Demo Mode</Link>
      </section>
    </main>
  );
}
