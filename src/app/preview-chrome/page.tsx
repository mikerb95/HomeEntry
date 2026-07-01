import { Chrome } from "@/components/Chrome";

export default function PreviewChrome() {
  return (
    <div>
      <Chrome
        title="Conjunto Altos del Parque"
        sub="Portería · Turno activo"
        role="Vigilante"
        badgeBg="#DCFCE7"
        badgeFg="#15803D"
      />
      <div style={{ padding: 20, fontFamily: "sans-serif", color: "#6B7585" }}>
        Preview de la navbar (Chrome).
      </div>
    </div>
  );
}
