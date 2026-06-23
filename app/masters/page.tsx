import type { Metadata } from "next";
import { MastersCatalogView } from "@/components/MastersCatalogView";
import { masterProfiles } from "@/lib/masters";

export const metadata: Metadata = {
  title: "РњР°Р№СЃС‚СЂРё | Р‘СѓРґРџРѕРјС–С‡",
  description:
    "РџРµСЂРµРІС–СЂРµРЅС– РјР°Р№СЃС‚СЂРё РґР»СЏ СЂРµРјРѕРЅС‚Сѓ С‚Р° Р±СѓРґС–РІРЅРёС†С‚РІР° Сѓ РІР°С€РѕРјСѓ РјС–СЃС‚С–.",
};

export default function MastersPage() {
  return <MastersCatalogView masters={masterProfiles} />;
}
