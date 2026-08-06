import { useEffect, useState } from "react";
import { Clock3, FileCheck2, RefreshCw } from "lucide-react";
import { prekinderApi, type PublishedResult } from "../services/api";
import { PrekinderBrand } from "../components/PrekinderBrand";

const labels: Record<string, string> = {
  ACCEPTED: "Aceptado/a",
  REJECTED: "No seleccionado/a",
  WAITLIST: "Lista de espera",
};
export function PrekinderResultPage() {
  const [results, setResults] = useState<PublishedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function load() {
    setLoading(true);
    setError("");
    void prekinderApi
      .myResults()
      .then(setResults)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No pudimos consultar los resultados.",
        ),
      )
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="pk-page px-4 py-8 sm:py-12">
      <main className="mx-auto max-w-2xl">
        <PrekinderBrand
          title="Resultados Prekínder"
          context="Portal oficial de publicación"
        />
        {loading ? (
          <div className="pk-panel mt-8 flex items-center justify-center gap-3 p-10 text-center font-semibold" role="status">
            <RefreshCw className="animate-spin text-blue-900" size={20} />
            Consultando resultados
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-900" role="alert">
            <p>{error}</p>
            <button className="secondary mt-4" onClick={load}>
              Intentar nuevamente
            </button>
          </div>
        ) : results.length ? (
          <div className="mt-8 space-y-4">
            {results.map((result) => (
              <article
                key={result.applicationId}
                className="pk-panel overflow-hidden p-7 shadow-[0_16px_40px_rgba(30,58,138,0.07)]"
              >
                <FileCheck2 size={30} className="text-azul-monte-tabor" />
                <p className="mt-5 text-sm font-semibold text-slate-500">
                  Resultado de {result.applicantName}
                </p>
                <h1 className="mt-2 text-3xl font-black">
                  {labels[result.decision] || result.decision}
                </h1>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Este resultado fue publicado el{" "}
                  {new Intl.DateTimeFormat("es-CL", {
                    dateStyle: "long",
                    timeStyle: "short",
                    timeZone: "America/Santiago",
                  }).format(new Date(result.publishedAt))}
                  .
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="pk-panel mt-8 p-8 text-center">
            <Clock3 className="mx-auto text-slate-300" size={36} />
            <h1 className="mt-4 text-xl font-black">
              Aún no hay resultados publicados
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Este portal se actualizará en la fecha programada por el colegio.
              Los correos enviados a la familia son una notificación
              complementaria.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
