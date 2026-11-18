export default function Header() {
  return (
    <header className="sc-header">
      <div className="sc-header-glow" aria-hidden="true" />
      <div className="sc-header-row">
        <div className="sc-logo" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 8H7" />
          </svg>
        </div>
        <div className="sc-header-text">
          <p className="sc-eyebrow">Self-checkout inteligente</p>
          <h1 className="sc-brand">SmartCart</h1>
          <p className="sc-tagline">
            Escaneie, some o total e finalize — pronto para a rede plugar o
            pagamento dela.
          </p>
        </div>
      </div>
    </header>
  );
}
