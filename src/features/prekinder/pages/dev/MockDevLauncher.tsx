import { Eye, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setMockMode } from "./mockApi";

const INSTRUMENTS = [
  { code: "PSYCHOLOGY", label: "Psicología", color: "#7c3aed", route: "/prekinder/evaluador/psychology/evaluacion/mock-psychology" },
  { code: "PSYCHOMOTOR", label: "Psicomotricidad", color: "#2563eb", route: "/prekinder/evaluador/psychomotor/evaluacion/mock-psychomotor" },
  { code: "ACADEMIC", label: "Académico", color: "#16a34a", route: "/prekinder/evaluador/academic/evaluacion/mock-academic" },
  { code: "ENTRY_INDICATORS", label: "Indicadores de ingreso", color: "#ea580c", route: "/prekinder/evaluador/indicators/evaluacion/mock-indicators" },
  { code: "GROUP_OBSERVATION", label: "Observación grupal", color: "#0891b2", route: "/prekinder/evaluador/group-observation/evaluacion/mock-group-observation" },
  { code: "DAP", label: "DAP", color: "#be185d", route: "/prekinder/evaluador/dap/evaluacion/mock-dap" },
  { code: "LEARNING_SUPPORT", label: "Apoyo al aprendizaje", color: "#9333ea", route: "/prekinder/evaluador/learning-support/evaluacion/mock-learning-support" },
];

export function MockDevLauncher() {
  const navigate = useNavigate();

  function handleNavigate(route: string) {
    setMockMode();
    navigate(route);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Eye className="text-slate-400" size={28} />
            <div>
              <h1 className="text-3xl font-black tracking-[-0.02em] text-slate-950">Consolas de Evaluadores</h1>
              <p className="mt-1 text-sm text-slate-500">Usa las páginas reales de cada evaluador · modo desarrollo con datos mock</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <Eye size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Modo desarrollo.</strong> Al hacer click, se precargan datos mock en sessionStorage y se abre la consola real del evaluador.
          </p>
        </div>

        <div className="space-y-3">
          {INSTRUMENTS.map((inst) => (
            <button
              key={inst.code}
              onClick={() => handleNavigate(inst.route)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: inst.color }} />
                <span className="text-lg font-black text-slate-900">{inst.label}</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
