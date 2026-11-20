/** Formata valor em reais (número) para BRL. */
export function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Converte preço em reais para centavos (inteiro). */
export function paraCentavos(precoReais) {
  return Math.round(Number(precoReais || 0) * 100);
}

/** Converte centavos (inteiro) para reais. */
export function deCentavos(centavos) {
  return Number(centavos || 0) / 100;
}

/** Formata centavos (inteiro) diretamente em BRL. */
export function moedaDeCentavos(centavos) {
  return moeda(deCentavos(centavos));
}
