import { useEffect, useState } from "react";

const STORAGE_KEY = "smartcart.theme";

function lerPreferencia() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === "light" || salvo === "dark") return salvo;
  } catch {
    /* ignore */
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", tema === "dark" ? "#121722" : "#eceae4");
  }
}

export function useTheme() {
  const [tema, setTema] = useState(() => lerPreferencia());

  useEffect(() => {
    aplicarTema(tema);
    try {
      localStorage.setItem(STORAGE_KEY, tema);
    } catch {
      /* ignore */
    }
  }, [tema]);

  function alternar() {
    setTema((atual) => (atual === "dark" ? "light" : "dark"));
  }

  return { tema, alternar, escuro: tema === "dark" };
}
