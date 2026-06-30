import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const steps = ["upload", "arrange", "caption", "render"] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      {/* ── 히어로: 주제(정지 사진이 부드럽게 움직임)를 직접 보여줌 ── */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            {t("brand.tagline")}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            {t("brand.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-accent px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {t("home.ctaPrimary")}
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line bg-surface px-5 py-3 text-sm font-medium text-ink transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("home.ctaSecondary")}
            </a>
          </div>
        </div>

        {/* 시그니처: 정지 이미지가 켄 번스로 드리프트하는 미리보기 */}
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
          <div
            className="absolute inset-0 motion-safe:animate-[kenburns-drift_12s_ease-in-out_infinite_alternate]"
            style={{
              background:
                "radial-gradient(120% 120% at 20% 10%, #7b79f2 0%, #5654d4 38%, #1a1d21 100%)",
            }}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4">
            <p className="font-mono text-xs text-white/90">
              00:04 · {t("home.demoCaption")}
            </p>
          </div>
        </div>
      </section>

      {/* ── 동작 방식: 4단계 ── */}
      <section id="how" className="mt-24 scroll-mt-20">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step}
              className="rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="font-mono text-sm text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-lg font-medium text-ink">
                {t(`home.steps.${step}`)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {t(`home.steps.${step}Desc`)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
