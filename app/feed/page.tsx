import { MasterCard } from "@/components/MasterCard";
import { WorkPost } from "@/components/WorkPost";
import { masters } from "@/lib/data";

export const metadata = {
  title: "Стрічка робіт | БудПоміч",
};

export default function FeedPage() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="page-heading">
          <p className="overline">Нові роботи спільноти</p>
          <h1>Стрічка робіт</h1>
          <p>Дивіться реальні об&apos;єкти, обсяг і вартість виконаних робіт.</p>
        </div>
        <div className="feed-layout">
          <div className="feed-column">
            <WorkPost
              master={masters[0]}
              crop="left"
              title="Ремонт ванної кімнати на Позняках"
              description="Підготовка поверхонь, укладання великоформатної плитки на стіни та підлогу, затирка й акуратні примикання."
              price="22 440 грн"
            />
            <WorkPost
              master={masters[2]}
              crop="right"
              title="Кухня після комплексного оздоблення"
              description="Вирівнювання і фарбування стін, підготовка електрики, монтаж освітлення та кухонних меблів."
              price="34 800 грн"
            />
          </div>
          <aside className="feed-sidebar">
            <p className="overline">ТОП майстри</p>
            <h2>Готові до роботи</h2>
            {masters.slice(1).map((master) => (
              <MasterCard master={master} key={master.id} />
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}
