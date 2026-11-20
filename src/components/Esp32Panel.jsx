export default function Esp32Panel({
  codigo,
  onCodigoChange,
  conectado,
  status,
  onConectar,
}) {
  return (
    <section className="sc-esp" aria-labelledby="titulo-esp32">
      <h3 id="titulo-esp32">Display TFT (opcional)</h3>
      <div className="sc-esp-row">
        <input
          type="text"
          value={codigo}
          onChange={(e) => onCodigoChange(e.target.value)}
          placeholder="demo"
          disabled={conectado}
          aria-label="Código do carrinho para o ESP32"
        />
        <button
          type="button"
          className={`sc-btn ${conectado ? "sc-btn-ghost" : "sc-btn-primary"}`}
          onClick={onConectar}
        >
          {conectado ? "Desconectar" : "Conectar"}
        </button>
      </div>
      <div className={`sc-esp-status ${status.tipo || ""}`}>{status.texto}</div>
    </section>
  );
}
