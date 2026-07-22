import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { getMasterById } from "@/lib/masters";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveAuthenticatedMasterIdentity } from "@/lib/master-identity";

export const metadata: Metadata = {
  title: "Редагувати профіль | Кабінет БудПоміч",
  description: "Редагування публічного профілю майстра.",
};

export default async function DashboardProfilePage() {
  const supabase = await createServerSupabaseClient();
  const resolved = supabase ? await resolveAuthenticatedMasterIdentity(supabase) : null;
  const master = resolved?.ok ? getMasterById(resolved.identity.masterSlug) : null;

  if (!master) {
    return <main className="profile-editor-page"><div className="dash-empty">Публічний профіль майстра ще не підключено до акаунта.</div></main>;
  }

  return (
    <main className="profile-editor-page">
      <header className="profile-editor-header">
        <Link className="profile-editor-brand" href="/dashboard">
          <Image
            className="profile-editor-logo"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПоміч — будівельний помічник"
            width={820}
            height={380}
            priority
          />
        </Link>
        <Link className="profile-editor-back" href="/dashboard">
          <ArrowLeft size={17} /> До кабінету
        </Link>
      </header>

      <section className="profile-editor-heading">
        <div>
          <p>Публічний профіль</p>
          <h1>Редагувати профіль</h1>
          <span>
            Актуалізуйте інформацію, яку клієнти бачать у каталозі та на
            сторінці майстра.
          </span>
        </div>
        <Link href={`/profile/${master.id}?from=profile`}>
          Переглянути профіль
        </Link>
      </section>

      <ProfileEditForm master={master} />
    </main>
  );
}
