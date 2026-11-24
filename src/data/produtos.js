export const bancoProdutos = {
  LEITE001: {
    nome: "Leite Integral 1L",
    preco: 4.99,
    codigoBarras: "7891000100011",
  },
  LEITE002: {
    nome: "Leite Desnatado 1L",
    preco: 5.29,
    codigoBarras: "7891000100028",
  },
  QUEIJO01: {
    nome: "Queijo Mussarela 200g",
    preco: 14.5,
    codigoBarras: "7891000100035",
  },
  MILHO01: {
    nome: "Milho",
    preco: 3.29,
    codigoBarras: "7891000100042",
  },
  PAO01: {
    nome: "Pão Francês",
    preco: 0.89,
    codigoBarras: "7891000200018",
  },
  PAO02: {
    nome: "Pão de Forma 500g",
    preco: 7.49,
    codigoBarras: "7891000200025",
  },
  OVOS001: {
    nome: "Dúzia de Ovos",
    preco: 12.9,
    codigoBarras: "7891000300015",
  },
  MACA01: {
    nome: "Maçã Fuji (un)",
    preco: 1.49,
    codigoBarras: "7891000400012",
  },
  BANANA01: {
    nome: "Banana Nanica (un)",
    preco: 0.79,
    codigoBarras: "7891000400029",
  },
  ARROZ001: {
    nome: "Arroz Tipo 1 5kg",
    preco: 24.99,
    codigoBarras: "7891000500019",
  },
  FEIJAO01: {
    nome: "Feijão Carioca 1kg",
    preco: 8.49,
    codigoBarras: "7891000500026",
  },
  CAFE001: {
    nome: "Café Torrado 500g",
    preco: 18.9,
    codigoBarras: "7891000600016",
  },
  CEREAL01: {
    nome: "Cereal",
    preco: 4.29,
    codigoBarras: "7891000600023",
  },
  PENNE01: {
    nome: "Macarrão Penne",
    preco: 6.99,
    codigoBarras: "7891000700013",
  },
  SABAO01: {
    nome: "Sabão em Pó 1kg",
    preco: 15.9,
    codigoBarras: "7891000800010",
  },
  AGUA001: {
    nome: "Água Mineral 1,5L",
    preco: 2.49,
    codigoBarras: "7891000900017",
  },
  SUCO001: {
    nome: "Suco de Uva",
    preco: 9.99,
    codigoBarras: "7891000900024",
  },
  BISCOITO01: {
    nome: "Biscoito Recheado",
    preco: 3.99,
    codigoBarras: "7891001000013",
  },
};

export const listaProdutos = Object.entries(bancoProdutos);

export function normalizarCodigo(codigo) {
  return String(codigo || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function resolverIdProduto(codigoLido) {
  const codigo = normalizarCodigo(codigoLido);
  if (!codigo) return null;
  if (bancoProdutos[codigo]) return codigo;
  const achado = listaProdutos.find(([, p]) => p.codigoBarras === codigo);
  return achado ? achado[0] : null;
}
