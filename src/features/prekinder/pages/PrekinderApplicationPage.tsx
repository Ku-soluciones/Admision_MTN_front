import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  LockKeyhole,
  UsersRound,
} from "lucide-react";
import {
  prekinderApi,
  type AdmissionProcess,
  type FlowApplication,
  type Wave,
} from "../services/api";
import { PrekinderBrand } from "../components/PrekinderBrand";

type Alumni = {
  status: "NO_ALUMNI" | "GRADUATED_4TH" | "WITHDREW";
  graduationYear?: number;
  lastGrade?: string;
  withdrawalReason?: string;
};
type FormState = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  fatherEmail: string;
  motherEmail: string;
  employeeParent: string;
  siblings: Array<{ name: string; rut: string; currentGrade: string }>;
  fatherAlumni: Alumni;
  motherAlumni: Alumni;
};
const empty: FormState = {
  rut: "",
  firstName: "",
  paternalLastName: "",
  maternalLastName: "",
  birthDate: "",
  fatherEmail: "",
  motherEmail: "",
  employeeParent: "",
  siblings: [],
  fatherAlumni: { status: "NO_ALUMNI" },
  motherAlumni: { status: "NO_ALUMNI" },
};
const waveNames: Record<string, string> = {
  SIBLINGS: "Hermanos de alumnos vigentes",
  STAFF_OR_ALUMNI: "Hijos de funcionarios o exalumnos",
  NEW_FAMILIES: "Nuevas familias",
};

function ageAt(date: string, instant = new Date()) {
  if (!date) return -1;
  const birth = new Date(`${date}T12:00:00`);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  })
    .format(instant)
    .split("-")
    .map(Number);
  let age = today[0] - birth.getFullYear();
  if (
    today[1] - 1 < birth.getMonth() ||
    (today[1] - 1 === birth.getMonth() && today[2] < birth.getDate())
  )
    age--;
  return age;
}
function category(form: FormState): Wave["waveType"] {
  if (form.siblings.length) return "SIBLINGS";
  if (
    form.employeeParent ||
    form.fatherAlumni.status !== "NO_ALUMNI" ||
    form.motherAlumni.status !== "NO_ALUMNI"
  )
    return "STAFF_OR_ALUMNI";
  return "NEW_FAMILIES";
}

export function PrekinderApplicationPage() {
  const [processes, setProcesses] = useState<AdmissionProcess[]>([]);
  const [processId, setProcessId] = useState("");
  const [waves, setWaves] = useState<Wave[]>([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(empty);
  const [submitted, setSubmitted] = useState<FlowApplication | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void prekinderApi
      .processes()
      .then((next) => {
        setProcesses(next);
        setProcessId(
          next.find((p) => p.acceptingApplications)?.processId ||
            next[0]?.processId ||
            "",
        );
      })
      .catch((reason) => setError(reason.message));
  }, []);
  useEffect(() => {
    if (processId)
      void prekinderApi
        .waves(processId)
        .then(setWaves)
        .catch((reason) => setError(reason.message));
  }, [processId]);
  const active = waves.find((wave) => wave.active);
  const declared = category(form);
  const age = ageAt(form.birthDate);
  const ageValid = age === 3 || age === 4;
  const blocked = !active || active.waveType !== declared;
  const canContinue =
    step === 1
      ? Boolean(
          form.rut &&
          form.firstName &&
          form.paternalLastName &&
          form.birthDate &&
          form.fatherEmail &&
          form.motherEmail &&
          ageValid,
        )
      : step === 2
        ? !blocked &&
          validAlumni(form.fatherAlumni) &&
          validAlumni(form.motherAlumni)
        : true;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function submit() {
    if (!canContinue || !processId) return;
    setBusy(true);
    setError("");
    try {
      const app = await prekinderApi.submitApplication({
        processId,
        rut: form.rut,
        firstName: form.firstName,
        paternalLastName: form.paternalLastName,
        maternalLastName: form.maternalLastName,
        birthDate: form.birthDate,
        familyEmail: form.fatherEmail,
        fatherEmail: form.fatherEmail,
        motherEmail: form.motherEmail,
        eligibility: {
          siblings: form.siblings,
          employeeParent: form.employeeParent,
          fatherAlumni: form.fatherAlumni,
          motherAlumni: form.motherAlumni,
        },
      });
      setSubmitted(app);
      setStep(3);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos enviar la postulación.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    if (!submitted || !files.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files)
        await prekinderApi.uploadDocument(
          submitted.applicationId,
          "ANTECEDENTE_POSTULACION",
          file,
        );
      setFiles([]);
      setStep(4);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos cargar los documentos.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pk-page">
      <header className="pk-topbar">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-3 px-4">
          <PrekinderBrand
            title="Postulación Prekínder"
            context="Monte Tabor y Nazaret · Familias"
          />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-7 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
              Proceso
            </p>
            <select
              className="control mt-2 w-full"
              value={processId}
              onChange={(e) => setProcessId(e.target.value)}
            >
              {processes.map((process) => (
                <option key={process.processId} value={process.processId}>
                  {process.name}
                </option>
              ))}
            </select>
            <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-6 lg:block lg:space-y-2">
              {[
                "Datos del postulante",
                "Vínculo y elegibilidad",
                "Documentos",
                "Comprobante",
              ].map((label, index) => (
                <li
                  key={label}
                  aria-current={step === index + 1 ? "step" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-[10px] px-2 text-center text-xs font-bold leading-tight lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-left lg:text-sm ${step === index + 1 ? "bg-azul-monte-tabor text-blanco-pureza" : step > index + 1 ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-current text-xs">
                    {step > index + 1 ? <Check size={15} /> : index + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </aside>
          <section>
            <WaveBanner active={active} declared={declared} />
            {error && (
              <div
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="pk-panel mt-5 p-5 shadow-[0_16px_40px_rgba(30,58,138,0.07)] lg:p-8">
              {step === 1 && (
                <ApplicantStep
                  form={form}
                  age={age}
                  ageValid={ageValid}
                  update={update}
                />
              )}
              {step === 2 && <EligibilityStep form={form} update={update} />}
              {step === 3 && (
                <DocumentsStep
                  files={files}
                  setFiles={setFiles}
                  onUpload={upload}
                  busy={busy}
                />
              )}
              {step === 4 && <Receipt submitted={submitted!} />}
              {step < 3 && (
                <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-5">
                  <button
                    className="secondary"
                    disabled={step === 1}
                    onClick={() => setStep((value) => value - 1)}
                  >
                    <ChevronLeft size={18} className="mr-1" />
                    Volver
                  </button>
                  {step === 1 ? (
                    <button
                      className="primary"
                      disabled={!canContinue}
                      onClick={() => setStep(2)}
                    >
                      Continuar
                      <ChevronRight size={18} className="ml-1" />
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={!canContinue || busy}
                      onClick={() => void submit()}
                    >
                      {busy ? "Enviando…" : "Enviar postulación"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function WaveBanner({
  active,
  declared,
}: {
  active: Wave | undefined;
  declared: Wave["waveType"];
}) {
  const matches = active?.waveType === declared;
  return (
    <div
      className={`rounded-xl border p-5 ${matches ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}`}
    >
      <div className="flex gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${matches ? "bg-azul-monte-tabor text-blanco-pureza" : "bg-amber-100 text-amber-900"}`}
        >
          {active ? <UsersRound size={20} /> : <LockKeyhole size={20} />}
        </span>
        <div>
          <h1 className="text-xl font-black">
            {active
              ? waveNames[active.waveType]
              : "Postulación temporalmente cerrada"}
          </h1>
          <p
            className={`mt-2 text-sm leading-6 ${matches ? "text-blue-950/75" : "text-amber-950/80"}`}
          >
            {!active
              ? "Administración aún no ha publicado una ventana de postulación."
              : matches
                ? "Tu declaración corresponde a esta oleada. Los antecedentes quedarán sujetos a revisión."
                : `Tu declaración corresponde a “${waveNames[declared]}”, por lo que no puede enviarse durante esta oleada.`}
          </p>
          {active?.closesAt && (
            <p
              className={`mt-3 text-xs font-bold ${matches ? "text-blue-900" : "text-amber-900"}`}
            >
              Disponible hasta el{" "}
              {new Intl.DateTimeFormat("es-CL", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "America/Santiago",
              }).format(new Date(active.closesAt))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicantStep({
  form,
  age,
  ageValid,
  update,
}: {
  form: FormState;
  age: number;
  ageValid: boolean;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <p className="text-xs font-bold text-blue-800">Paso 1 de 4</p>
      <h2 className="mt-1 text-2xl font-black">Datos del postulante</h2>
      <p className="mt-2 text-sm text-slate-500">
        La edad se valida nuevamente con la hora oficial del servidor al enviar.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Input
          label="RUT"
          required
          value={form.rut}
          onChange={(value) => update("rut", value)}
        />
        <Input
          label="Nombres"
          required
          value={form.firstName}
          onChange={(value) => update("firstName", value)}
        />
        <Input
          label="Apellido paterno"
          required
          value={form.paternalLastName}
          onChange={(value) => update("paternalLastName", value)}
        />
        <Input
          label="Apellido materno"
          value={form.maternalLastName}
          onChange={(value) => update("maternalLastName", value)}
        />
        <label className="text-xs font-extrabold text-slate-600">
          Fecha de nacimiento
          <input
            required
            className={`control mt-1 w-full ${form.birthDate && !ageValid ? "border-red-400 ring-2 ring-red-100" : ""}`}
            type="date"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
          />
          <span
            className={`mt-2 block font-semibold ${form.birthDate && !ageValid ? "text-red-700" : "text-slate-500"}`}
          >
            {form.birthDate
              ? ageValid
                ? `${age} años cumplidos · edad válida`
                : `Tiene ${age} años. Debe tener exactamente 3 o 4 años.`
              : "Debe tener 3 o 4 años cumplidos."}
          </span>
        </label>
        <Input
          label="Correo del padre"
          required
          type="email"
          value={form.fatherEmail}
          onChange={(value) => update("fatherEmail", value)}
        />
        <Input
          label="Correo de la madre"
          required
          type="email"
          value={form.motherEmail}
          onChange={(value) => update("motherEmail", value)}
        />
      </div>
      <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Ambos correos recibirán por separado la fecha, horario, grupo y sala de
        cada asignación o reagendamiento.
      </p>
    </>
  );
}

function EligibilityStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const [hasSibling, setHasSibling] = useState(form.siblings.length > 0);
  const [sibling, setSibling] = useState(
    form.siblings[0] || { name: "", rut: "", currentGrade: "" },
  );
  useEffect(() => {
    update(
      "siblings",
      hasSibling && sibling.name && sibling.rut && sibling.currentGrade
        ? [sibling]
        : [],
    );
  }, [hasSibling, sibling]);
  return (
    <>
      <p className="text-xs font-bold text-blue-800">Paso 2 de 4</p>
      <h2 className="mt-1 text-2xl font-black">Vínculo con el colegio</h2>
      <p className="mt-2 text-sm text-slate-500">
        La categoría se calcula por prioridad y administración revisará los
        antecedentes.
      </p>
      <div className="mt-6 space-y-6">
        <fieldset className="rounded-xl border border-slate-200 p-5">
          <legend className="px-2 font-black">Hermano vigente</legend>
          <Choice
            checked={hasSibling}
            onChange={setHasSibling}
            yes="Sí, tiene hermano en el colegio"
            no="No tiene hermano vigente"
          />
          {hasSibling && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input
                label="Nombre"
                value={sibling.name}
                onChange={(name) => setSibling({ ...sibling, name })}
              />
              <Input
                label="RUT"
                value={sibling.rut}
                onChange={(rut) => setSibling({ ...sibling, rut })}
              />
              <Input
                label="Curso actual"
                value={sibling.currentGrade}
                onChange={(currentGrade) =>
                  setSibling({ ...sibling, currentGrade })
                }
              />
            </div>
          )}
        </fieldset>
        <fieldset className="rounded-xl border border-slate-200 p-5">
          <legend className="px-2 font-black">Funcionario MTN</legend>
          <label className="mt-2 block text-xs font-extrabold text-slate-600">
            Padre o madre relacionado
            <select
              className="control mt-1 w-full"
              value={form.employeeParent}
              onChange={(e) => update("employeeParent", e.target.value)}
            >
              <option value="">Ninguno</option>
              <option value="FATHER">Padre</option>
              <option value="MOTHER">Madre</option>
              <option value="BOTH">Ambos</option>
            </select>
          </label>
        </fieldset>
        <div className="grid gap-5 lg:grid-cols-2">
          <AlumniEditor
            title="Antecedente del padre"
            value={form.fatherAlumni}
            onChange={(value) => update("fatherAlumni", value)}
          />
          <AlumniEditor
            title="Antecedente de la madre"
            value={form.motherAlumni}
            onChange={(value) => update("motherAlumni", value)}
          />
        </div>
      </div>
    </>
  );
}

function AlumniEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Alumni;
  onChange: (value: Alumni) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-5">
      <legend className="px-2 font-black">{title}</legend>
      <select
        className="control mt-2 w-full"
        value={value.status}
        onChange={(e) =>
          onChange({ status: e.target.value as Alumni["status"] })
        }
      >
        <option value="NO_ALUMNI">No es exalumno/a</option>
        <option value="GRADUATED_4TH">Egresó de 4º medio</option>
        <option value="WITHDREW">Se retiró antes de egresar</option>
      </select>
      {value.status === "GRADUATED_4TH" && (
        <label className="mt-3 block text-xs font-extrabold text-slate-600">
          Año de egreso
          <input
            className="control mt-1 w-full"
            type="number"
            min="1950"
            max={new Date().getFullYear()}
            value={value.graduationYear || ""}
            onChange={(e) =>
              onChange({ ...value, graduationYear: Number(e.target.value) })
            }
          />
        </label>
      )}
      {value.status === "WITHDREW" && (
        <div className="mt-3 space-y-3">
          <Input
            label="Último curso realizado"
            value={value.lastGrade || ""}
            onChange={(lastGrade) => onChange({ ...value, lastGrade })}
          />
          <label className="block text-xs font-extrabold text-slate-600">
            Motivo de retiro
            <textarea
              className="control mt-1 min-h-24 w-full py-3"
              value={value.withdrawalReason || ""}
              onChange={(e) =>
                onChange({ ...value, withdrawalReason: e.target.value })
              }
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
function validAlumni(value: Alumni) {
  if (value.status === "GRADUATED_4TH") return Boolean(value.graduationYear);
  if (value.status === "WITHDREW")
    return Boolean(value.lastGrade && value.withdrawalReason);
  return true;
}

function DocumentsStep({
  files,
  setFiles,
  onUpload,
  busy,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
  onUpload: () => void;
  busy: boolean;
}) {
  const [fileError, setFileError] = useState("");
  function selectFiles(next: File[]) {
    const supported = ["application/pdf", "image/jpeg", "image/png"];
    const invalid = next.find(
      (file) => !supported.includes(file.type) || file.size > 20 * 1024 * 1024,
    );
    if (invalid) {
      setFileError(
        `${invalid.name} no se puede adjuntar. Usa PDF, JPG o PNG de hasta 20 MB.`,
      );
      setFiles([]);
      return;
    }
    setFileError("");
    setFiles(next);
  }
  return (
    <div className="text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-azul-monte-tabor">
        <FileUp />
      </span>
      <h2 className="mt-5 text-2xl font-black">Adjunta los antecedentes</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        Adjunta archivos claros y completos. Puedes revisar la selección antes
        de finalizar la postulación.
      </p>
      <label className="mt-7 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 hover:border-blue-400">
        <input
          className="sr-only"
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => selectFiles(Array.from(e.target.files || []))}
        />
        <FileUp className="mx-auto text-slate-400" />
        <span className="mt-3 block text-sm font-bold">
          Seleccionar PDF o imágenes
        </span>
        <span className="mt-1 block text-xs text-slate-400">
          Máximo 20 MB por archivo
        </span>
      </label>
      {fileError && (
        <p
          className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-900"
          role="alert"
        >
          {fileError}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-4 space-y-2 text-left">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold"
            >
              <span className="break-all">{file.name}</span>
              <span className="ml-2 text-xs font-medium text-slate-500">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </li>
          ))}
        </ul>
      )}
      <button
        className="primary mt-6 w-full"
        disabled={!files.length || busy}
        onClick={() => void onUpload()}
      >
        {busy ? "Cargando…" : "Cargar y finalizar"}
      </button>
      <button
        className="mt-4 text-sm font-bold text-slate-500 underline"
        disabled={!files.length}
        onClick={() => setFiles([])}
      >
        Limpiar selección
      </button>
    </div>
  );
}
function Receipt({ submitted }: { submitted: FlowApplication }) {
  return (
    <div className="py-5 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-800">
        <Check size={32} />
      </span>
      <h2 className="mt-5 text-2xl font-black">Postulación recibida</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        Guardamos la postulación en el proceso Prekínder. La elegibilidad
        permanece pendiente de revisión y no cambia de oleada automáticamente.
      </p>
      <div className="mx-auto mt-6 max-w-sm rounded-xl bg-slate-50 p-4 text-left">
        <p className="text-xs font-bold text-slate-400">
          Código de postulación
        </p>
        <p className="mt-1 break-all font-mono text-sm font-bold">
          {submitted.applicationId}
        </p>
      </div>
    </div>
  );
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-extrabold text-slate-600">
      {label}
      <input
        className="control mt-1 w-full"
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Choice({
  checked,
  onChange,
  yes,
  no,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  yes: string;
  no: string;
}) {
  const options: Array<[boolean, string]> = [
    [true, yes],
    [false, no],
  ];
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {options.map(([value, label]) => (
        <button
          type="button"
          key={label}
          onClick={() => onChange(value)}
          aria-pressed={checked === value}
          className={`min-h-12 rounded-lg border px-3 text-sm font-bold transition-colors ${checked === value ? "border-azul-monte-tabor bg-blue-50 text-azul-monte-tabor" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
