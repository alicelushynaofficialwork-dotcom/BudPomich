import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderRequestForm } from "@/components/OrderRequestForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getMasterRequestServices } from "@/lib/master-services";
import { getMasterById, masterProfiles } from "@/lib/masters";
import "../../request.css";

type RequestPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return [
    ...masterProfiles.map(({ id }) => ({ id })),
    ...masterProfiles.map((_, index) => ({ id: String(index + 1) })),
  ];
}

export async function generateMetadata({ params }: RequestPageProps): Promise<Metadata> {
  const master = getMasterById((await params).id);

  return {
    title: master ? `Оформлення заявки до ${master.name} | БудПомiч` : "Оформлення заявки",
    description: master
      ? `Оберіть послугу, дату, додайте опис роботи та контакти для заявки до ${master.name}.`
      : undefined,
  };
}

export default async function MasterRequestPage({ params }: RequestPageProps) {
  const master = getMasterById((await params).id);

  if (!master) {
    notFound();
  }

  const services = getMasterRequestServices(master);

  return (
    <main className="request-page">
      <SiteHeader active="masters" showMasterCard />

      <div className="request-wrap">
        <Link className="request-breadcrumb" href={`/profile/${master.id}`}>
          ← {master.name}
        </Link>

        <header className="request-page-head">
          <p className="request-eyebrow">Заявка · крок 1 з 1</p>
          <h1>Оформлення заявки</h1>
          <p>
            Перевірте деталі та заповніть контактну інформацію — Андрій звʼяжеться з вами протягом ~2 год.
          </p>
        </header>

        <div className="request-ruler" aria-hidden="true" />

        <section className="request-master-summary" aria-label="Обраний майстер">
          <div className="order-section-head">
            <span>01</span>
            <strong>Обраний майстер</strong>
          </div>
          <div className="request-master-card">
            <div className="request-master-photo">
              {master.avatarUrl ? (
                <Image src={master.avatarUrl} alt={master.name} width={112} height={112} />
              ) : (
                <span>{master.initials}</span>
              )}
            </div>
            <div className="request-master-info">
              <p>{master.profession} · {master.city}{master.district ? `, ${master.district}` : ""}</p>
              <h2>{master.name}</h2>
              <div>
                <span className="request-verified">✓ Перевірений майстер</span>
                <span>{master.experience}</span>
                <span>Відповідає ~2 год</span>
              </div>
            </div>
            <Link href={`/profile/${master.id}`}>Змінити майстра</Link>
          </div>
        </section>

        <OrderRequestForm
          masterId={master.id}
          masterName={master.name}
          busyDates={master.busyDates}
          pendingDates={master.pendingDates}
          masterServices={services}
          priceFrom={master.priceFrom}
        />
      </div>
    </main>
  );
}
