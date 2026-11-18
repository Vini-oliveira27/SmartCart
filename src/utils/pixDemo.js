/**
 * Gera payload PIX fictício só para demonstração.
 * Não é um BR Code válido para pagamento real —
 * a rede varejista integra o próprio PSP/adquirente.
 */
export function gerarPixDemo(total) {
  const valor = Number(total).toFixed(2);
  const txid = `SC${Date.now().toString(36).toUpperCase()}`;
  const copiaCola = [
    "000201",
    "26580014BR.GOV.BCB.PIX",
    "0136smartcart.demo@ficticio.br",
    "52040000",
    "5303986",
    `54${String(valor.length).padStart(2, "0")}${valor}`,
    "5802BR",
    "5913SMARTCART DEMO",
    "6009SAO PAULO",
    `62${String(txid.length + 4).padStart(2, "0")}05${String(txid.length).padStart(2, "0")}${txid}`,
    "6304DEMO",
  ].join("");

  return {
    copiaCola,
    txid,
    valor,
    aviso:
      "PIX de demonstração. Em produção, cada rede conecta o próprio gateway de pagamento.",
  };
}
