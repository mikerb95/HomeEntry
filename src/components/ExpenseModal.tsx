"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordExpense } from "@/app/actions/finance";
import { Modal } from "@/components/Modal";
import { useToast } from "@/lib/toast";

const CATEGORIES = [
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "aseo", label: "Aseo" },
  { id: "jardineria", label: "Jardinería" },
  { id: "seguridad", label: "Seguridad" },
  { id: "otro", label: "Otro" },
];

export function ExpenseModal({
  slug,
  vendors,
  onClose,
}: {
  slug: string;
  vendors: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("mantenimiento");
  const [description, setDescription] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [expenseDate, setExpenseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [pending, start] = useTransition();
  const router = useRouter();
  const show = useToast((s) => s.show);

  function save() {
    if (!vendorId) {
      show("Selecciona el proveedor", "warn");
      return;
    }
    const n = parseInt(amount.replace(/\D/g, "") || "0", 10);
    if (n <= 0) {
      show("Ingresa un monto válido", "warn");
      return;
    }
    if (!description.trim()) {
      show("Describe el gasto", "warn");
      return;
    }
    start(async () => {
      const res = await recordExpense(slug, {
        vendorId,
        amount,
        category,
        description,
        invoiceRef,
        expenseDate,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Gasto registrado", "ok");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal onClose={onClose} label="Registrar gasto" className="w-[420px]">
        <div className="flex items-center justify-between border-b border-[#EEF1F6] px-[22px] py-[18px]">
          <span className="font-display text-[20px] font-bold">Registrar gasto</span>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="h-[30px] w-[30px] rounded-[9px] bg-[#F0F3F8] text-[17px] text-[#5B6675]"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-[22px] py-5">
          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Proveedor
          </label>
          <div className="relative mb-4">
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] py-3.5 pl-4 pr-10 text-[15px] font-semibold outline-none focus:border-blue"
            >
              <option value="">Selecciona proveedor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-[15px] top-1/2 -translate-y-1/2 text-[12px] text-[#6B7585]">
              ▾
            </span>
          </div>

          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Monto (COP)
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="0"
            className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[16px] font-bold outline-none focus:border-blue"
          />

          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Categoría
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="rounded-[10px] border-2 px-3 py-2 text-[12.5px] font-bold"
                style={{
                  borderColor: category === c.id ? "#2F6BFF" : "#E3E8EF",
                  background: category === c.id ? "#EAF1FF" : "#fff",
                  color: category === c.id ? "#2F6BFF" : "#6B7585",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Fecha del gasto
          </label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[15px] font-semibold outline-none focus:border-blue"
          />

          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Descripción
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Poda de zonas verdes, torre 2"
            className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[14px] font-semibold outline-none focus:border-blue"
          />

          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Referencia de factura (opcional)
          </label>
          <input
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
            placeholder="Ej: FV-00231"
            className="mb-5 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[14px] font-semibold outline-none focus:border-blue"
          />

          <button
            onClick={save}
            disabled={pending}
            className="w-full rounded-[14px] bg-blue p-4 text-[15px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
          >
            Registrar gasto
          </button>
        </div>
    </Modal>
  );
}
