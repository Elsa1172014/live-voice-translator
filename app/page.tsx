export default function LandingPage() {
  const target = 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/examples/image-tracking/assets/card-example/card.png';

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1 text-sm text-amber-300">
            تجربة الواقع المعزّز — AR
          </span>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">الحضارة المصرية القديمة</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-9 text-slate-300">
            شيّد المصريون القدماء الأهرامات منذ آلاف السنين، فكانت شاهدًا على تقدّمهم المذهل في الهندسة والعمارة، وما زالت إلى اليوم رمزًا خالدًا لقوة الحضارة المصرية وعبقريتها.
          </p>
        </div>

        <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl">
          <div className="rounded-2xl bg-amber-50 p-4 text-center">
            <p className="text-sm font-semibold text-amber-800">الهدف الذي ستتعرف عليه كاميرا الهاتف الثاني</p>
            <p className="mt-1 text-xs text-slate-500">وجّه الكاميرا إلى الصورة كاملة، وليس إلى النص وحده.</p>
          </div>
          <img
            src={target}
            alt="AR target"
            className="mx-auto mt-5 w-full max-w-lg rounded-xl border border-slate-200"
          />
        </section>

        <section className="mx-auto mt-7 max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">طريقة التجربة الآن</h2>
          <p className="mt-3 leading-8 text-slate-300">
            اترك هذه الصفحة مفتوحة على الهاتف الأول. على الهاتف الثاني افتح زر الكاميرا أدناه، اسمح باستخدام الكاميرا، ثم وجّهها إلى الصورة الموجودة فوق. عند التعرّف عليها سيظهر هرم ثلاثي الأبعاد فوق الهدف.
          </p>
          <a
            href="/ar.html"
            className="mt-5 inline-flex rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
          >
            افتح كاميرا AR
          </a>
        </section>
      </div>
    </main>
  );
}
