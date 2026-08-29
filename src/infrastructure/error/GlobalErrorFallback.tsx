export function GlobalErrorFallback() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      className="sf-card"
      style={{
        maxWidth: 480,
        margin: '15vh auto',
        padding: 'var(--space-xl)',
        textAlign: 'center',
        border: '1px solid var(--color-danger)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      <h1 className="text-h3" style={{ marginBottom: 'var(--space-sm)' }}>
        Something went wrong
      </h1>
      <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
        The application ran into an unexpected error. Reloading the page usually fixes this.
      </p>
      <button
        type="button"
        onClick={handleReload}
        className="sf-btn sf-btn-primary"
        style={{ padding: 'var(--space-sm) var(--space-xl)', fontWeight: 700 }}
      >
        Reload page
      </button>
    </div>
  );
}
