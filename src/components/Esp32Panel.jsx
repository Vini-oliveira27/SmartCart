export default function Esp32Panel({
  codigo,
  onCodigoChange,
  conectado,
  status,
  onConectar,
}) {
  return (
    <section className="sc-esp" aria-labelledby="titulo-esp32">
      <h2 id="titulo-esp32">Display ESP32</h2>
      <p>
        Envia o total da compra para o TFT. Use o mesmo código configurado no
        firmware (<code>CODIGO_CARRINHO</code>).
      </p>
      <div className="sc-esp-row">
        <input
          type="text"
          value={codigo}
          onChange={(e) => onCodigoChange(e.target.value)}
          aria-label="Código do carrinho para o ESP32"
        />
        <button type="button" className="sc-btn sc-btn-ghost" onClick={onConectar}>
          {conectado ? "Desconectar" : "Conectar"}
        </button>
      </div>
      <div className={`sc-esp-status ${status.tipo || ""}`}>{status.texto}</div>
    </section>
  );
}
