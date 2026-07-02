"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-[13px] bg-blue px-[18px] py-[13px] text-[14.5px] font-bold text-white hover:bg-blue-dark print:hidden"
    >
      Imprimir o guardar PDF
    </button>
  );
}
