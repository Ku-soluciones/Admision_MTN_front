type PrekinderBrandProps = {
  title: string;
  context: string;
  compactOnMobile?: boolean;
};

export function PrekinderBrand({
  title,
  context,
  compactOnMobile = false,
}: PrekinderBrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src="https://ik.imagekit.io/11mmsqbe5/mtn-admisiones/Logo%20Colegio%20monte%20tabor%20y%20Nazaret%20II.png"
        alt="Colegio Monte Tabor y Nazaret"
        className="h-10 w-auto shrink-0 object-contain sm:h-12"
      />
      <span className={`min-w-0 ${compactOnMobile ? "hidden sm:block" : ""}`}>
        <span
          className="block truncate font-serif text-[15px] font-black leading-tight text-azul-monte-tabor"
        >
          {title}
        </span>
        <span
          className="mt-0.5 block truncate text-[11px] font-bold uppercase tracking-[0.12em] text-gris-piedra"
        >
          {context}
        </span>
      </span>
    </div>
  );
}
