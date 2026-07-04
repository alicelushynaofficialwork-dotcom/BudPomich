"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Home, ShieldCheck, Wrench } from "lucide-react";

type Role = "client" | "master";
type MasterBasics = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

const specialties = [
  "Гіпсокартонник",
  "Плиточник",
  "Електрик",
  "Сантехнік",
  "Маляр",
  "Столяр",
  "Універсал",
];

const districts = [
  "Печерський район",
  "Шевченківський район",
  "Голосіївський район",
  "Дніпровський район",
  "Дарницький район",
  "Передмістя до 30 км",
];

export function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [masterBasics, setMasterBasics] = useState<MasterBasics>({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [successRole, setSuccessRole] = useState<Role | null>(null);
  const [error, setError] = useState("");

  function chooseRole(nextRole: Role) {
    setRole(nextRole);
    setSuccessRole(null);
    setError("");
  }

  function resetRole() {
    setRole(null);
    setSuccessRole(null);
    setError("");
  }

  function updateMasterBasics(field: keyof MasterBasics, value: string) {
    setMasterBasics((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function toggleValue(value: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>, formRole: Role) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const hasEmptyClientField =
      formRole === "client" &&
      ["clientName", "clientPhone", "clientEmail", "clientPassword", "clientCity"].some(
        (name) => !String(formData.get(name) ?? "").trim(),
      );
    const hasEmptyMasterLogin =
      formRole === "master" && Object.values(masterBasics).some((value) => !value.trim());
    const hasEmptyMasterDetails =
      formRole === "master" && !String(formData.get("masterExperience") ?? "").trim();

    if (hasEmptyClientField || hasEmptyMasterLogin || hasEmptyMasterDetails) {
      setError("Заповніть обов'язкові поля, щоб продовжити.");
      return;
    }

    if (formRole === "master" && !selectedSpecialties.length) {
      setError("Оберіть хоча б одну спеціалізацію майстра.");
      return;
    }

    if (!formData.get(formRole === "client" ? "clientAgree" : "masterAgree")) {
      setError("Потрібна згода з умовами та політикою конфіденційності.");
      return;
    }

    setError("");
    setSuccessRole(formRole);
    if (formRole === "client") {
      window.setTimeout(() => router.push("/masters"), 900);
    }
  }

  if (successRole) {
    return (
      <section className="register-success" aria-live="polite">
        <div>
          <Check size={28} />
        </div>
        <h2>{successRole === "master" ? "Заявку на реєстрацію надіслано" : "Акаунт створено"}</h2>
        <p>
          {successRole === "master"
            ? "Ми перевіримо ваші дані протягом 1 робочого дня. Після підтвердження профіль з'явиться в каталозі майстрів."
            : "Переходимо до каталогу майстрів. Там можна знайти спеціаліста і залишити заявку."}
        </p>
        <Link className="register-submit-link" href={successRole === "master" ? "/dashboard/profile" : "/masters"}>
          {successRole === "master" ? "Перейти до кабінету" : "Перейти до каталогу"}
          <ArrowRight size={17} />
        </Link>
      </section>
    );
  }

  return (
    <div className="register-flow">
      <section className="register-step" id="role">
        <div className="register-step-head">
          <span>01</span>
          <strong>Оберіть, хто ви</strong>
        </div>

        {!role ? (
          <div className="register-role-grid">
            <button className="register-role-card" onClick={() => chooseRole("client")} type="button">
              <i className="register-role-check" />
              <span>
                <Home size={22} />
              </span>
              <h2>Я клієнт</h2>
              <p>Шукаю перевіреного майстра для ремонту чи разової роботи</p>
            </button>
            <button className="register-role-card" onClick={() => chooseRole("master")} type="button">
              <i className="register-role-check" />
              <span>
                <Wrench size={22} />
              </span>
              <h2>Я майстер</h2>
              <p>Пропоную послуги та хочу отримувати замовлення від клієнтів</p>
            </button>
          </div>
        ) : (
          <div className="register-role-summary">
            <div>
              <span>{role === "client" ? <Home size={19} /> : <Wrench size={19} />}</span>
              <div>
                <strong>{role === "client" ? "Я клієнт" : "Я майстер"}</strong>
                <small>{role === "client" ? "Шукаю майстра для ремонту" : "Пропоную послуги клієнтам"}</small>
              </div>
            </div>
            <button onClick={resetRole} type="button">
              Змінити
            </button>
          </div>
        )}
      </section>

      {role === "client" && (
        <section className="register-step">
          <div className="register-step-head">
            <span>02</span>
            <strong>Дані для входу</strong>
          </div>
          <form className="register-panel" onSubmit={(event) => submit(event, "client")} noValidate>
            <div className="register-row">
              <label>
                Ім'я та прізвище
                <input name="clientName" placeholder="Олена Коваль" type="text" />
              </label>
              <label>
                Телефон
                <input name="clientPhone" placeholder="+380 67 123 45 67" type="tel" />
              </label>
            </div>
            <div className="register-row">
              <label>
                Email
                <input name="clientEmail" placeholder="olena@mail.com" type="email" />
              </label>
              <label>
                Пароль
                <input name="clientPassword" placeholder="Мінімум 8 символів" type="password" />
              </label>
            </div>
            <label>
              Місто
              <select defaultValue="" name="clientCity">
                <option disabled value="">
                  Оберіть місто
                </option>
                <option>Київ</option>
                <option>Дніпро</option>
                <option>Львів</option>
                <option>Одеса</option>
                <option>Харків</option>
              </select>
            </label>
            <label className="register-checkbox">
              <input name="clientAgree" type="checkbox" />
              <span>
                Погоджуюсь з <Link href="/about">умовами користування</Link> та{" "}
                <Link href="/about">політикою конфіденційності</Link>
              </span>
            </label>
            {error && <p className="register-error">{error}</p>}
            <button className="register-submit" type="submit">
              Зареєструватися як клієнт
              <ArrowRight size={17} />
            </button>
          </form>
        </section>
      )}

      {role === "master" && (
        <>
          <section className="register-step">
            <div className="register-step-head">
              <span>02</span>
              <strong>Дані для входу</strong>
            </div>
            <div className="register-panel register-panel-master">
              <div className="register-row">
                <label>
                  Ім'я та прізвище
                  <input
                    onChange={(event) => updateMasterBasics("name", event.target.value)}
                    placeholder="Андрій Пономаренко"
                    type="text"
                    value={masterBasics.name}
                  />
                </label>
                <label>
                  Телефон
                  <input
                    onChange={(event) => updateMasterBasics("phone", event.target.value)}
                    placeholder="+380 67 123 45 67"
                    type="tel"
                    value={masterBasics.phone}
                  />
                </label>
              </div>
              <div className="register-row">
                <label>
                  Email
                  <input
                    onChange={(event) => updateMasterBasics("email", event.target.value)}
                    placeholder="andrii@mail.com"
                    type="email"
                    value={masterBasics.email}
                  />
                </label>
                <label>
                  Пароль
                  <input
                    onChange={(event) => updateMasterBasics("password", event.target.value)}
                    placeholder="Мінімум 8 символів"
                    type="password"
                    value={masterBasics.password}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="register-step">
            <div className="register-step-head">
              <span>03</span>
              <strong>Про вас як майстра</strong>
            </div>
            <form className="register-panel" onSubmit={(event) => submit(event, "master")} noValidate>
              <label>
                Спеціалізація
                <small>Оберіть один чи декілька напрямків</small>
                <div className="register-chip-group">
                  {specialties.map((item) => (
                    <button
                      className={selectedSpecialties.includes(item) ? "active" : ""}
                      key={item}
                      onClick={() => toggleValue(item, selectedSpecialties, setSelectedSpecialties)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                Райони роботи
                <small>Київ та передмістя — оберіть зони виїзду</small>
                <div className="register-chip-group">
                  {districts.map((item) => (
                    <button
                      className={selectedDistricts.includes(item) ? "active" : ""}
                      key={item}
                      onClick={() => toggleValue(item, selectedDistricts, setSelectedDistricts)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                Досвід роботи
                <select defaultValue="" name="masterExperience">
                  <option disabled value="">
                    Оберіть варіант
                  </option>
                  <option>Менше 1 року</option>
                  <option>1-3 роки</option>
                  <option>3-5 років</option>
                  <option>5+ років</option>
                </select>
              </label>

              <label>
                Про себе
                <textarea
                  name="masterAbout"
                  placeholder="Опишіть свій досвід, з якими типами об'єктів працюєте, чим можете бути корисні клієнту"
                />
              </label>

              <div className="register-note">
                <ShieldCheck size={18} />
                <span>
                  Після реєстрації ми перевіримо ваші дані. Після підтвердження профіль отримає позначку
                  "Перевірений майстер" і з'явиться в каталозі.
                </span>
              </div>

              <label className="register-checkbox">
                <input name="masterAgree" type="checkbox" />
                <span>
                  Погоджуюсь з <Link href="/about">умовами користування</Link> та{" "}
                  <Link href="/about">політикою конфіденційності</Link>
                </span>
              </label>

              {error && <p className="register-error">{error}</p>}
              <button className="register-submit" type="submit">
                Зареєструватися як майстер
                <ArrowRight size={17} />
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
