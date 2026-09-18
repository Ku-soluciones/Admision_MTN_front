import { useEffect, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";
import { prekinderApi, type AdmissionOffer } from "../services/api";
import { PrekinderBrand } from "../components/PrekinderBrand";

export function PrekinderOfferPage() {
  const [offers, setOffers] = useState<AdmissionOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function load() {
    setLoading(true);
    setError("");
    void prekinderApi.myOffers()
      .then(setOffers)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No pudimos consultar las ofertas.",
        ),
      )
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);
  async function respond(offer: AdmissionOffer, response: "ACCEPTED" | "DECLINED") {
    setLoading(true); setError("");
    try { await prekinderApi.respondOffer(offer.offerId, response, offer.version); load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No pudimos registrar tu respuesta."); setLoading(false); }
  }
  async function payIncorporation(applicationId: string) {
    setLoading(true); setError("");
    try {
      const payment = await prekinderApi.checkoutIncorporation(applicationId);
      if (!payment.checkoutUrl) throw new Error("El colegio no entregó un enlace de pago.");
      window.location.assign(payment.checkoutUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos iniciar el pago de incorporación.");
      setLoading(false);
    }
  }
  return (
    <div className="pk-page px-4 py-8 sm:py-12">
      <main className="mx-auto max-w-2xl">
        <PrekinderBrand
          title="Oferta de matrícula Prekínder"
          context="Acceso disponible únicamente para familias con una oferta vigente"
        />
        {loading ? (
          <div className="pk-panel mt-8 flex items-center justify-center gap-3 p-10 text-center font-semibold" role="status">
            <RefreshCw className="animate-spin text-blue-900" size={20} />
            Consultando ofertas
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-900" role="alert">
            <p>{error}</p>
            <button className="secondary mt-4" onClick={load}>
              Intentar nuevamente
            </button>
          </div>
        ) : offers.length ? (
          <div className="mt-8 space-y-4">
            {offers.map((offer) => (
              <article
                key={offer.offerId}
                className="pk-panel overflow-hidden p-7 shadow-[0_16px_40px_rgba(30,58,138,0.07)]"
              >
                <p className="text-sm font-semibold text-slate-500">{offer.processName} · {offer.academicYear}</p>
                <h1 className="mt-2 text-3xl font-black">Oferta de matrícula</h1>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  El resultado oficial fue informado al correo registrado por la familia.
                </p>
                {(() => {
                  if (offer.status === "ACCEPTED") return <div className="mt-5 rounded-lg bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Oferta aceptada. La matrícula se confirma únicamente al pagar la incorporación.</p><button className="primary mt-4" onClick={() => void payIncorporation(offer.applicationId)}>Pagar incorporación</button></div>;
                  if (offer.status !== "OFFERED") return <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-700">Oferta: {offer.status === "DECLINED" ? "rechazada" : "vencida"}.</p>;
                  return <div className="mt-6 border-t border-slate-100 pt-5"><p className="text-sm font-bold text-slate-900">Confirma tu respuesta antes del {new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(offer.expiresAt))}.</p><div className="mt-4 flex flex-wrap gap-3"><button className="primary" onClick={() => void respond(offer, "ACCEPTED")}>Aceptar oferta</button><button className="secondary" onClick={() => void respond(offer, "DECLINED")}>Rechazar oferta</button></div></div>;
                })()}
              </article>
            ))}
          </div>
        ) : (
          <div className="pk-panel mt-8 p-8 text-center">
            <Clock3 className="mx-auto text-slate-300" size={36} />
            <h1 className="mt-4 text-xl font-black">
              No hay ofertas vigentes
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Los resultados se comunican exclusivamente por correo. Esta sección
              se habilita solamente cuando existe una oferta que responder.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
