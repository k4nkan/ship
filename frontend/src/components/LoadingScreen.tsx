type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = "読み込み中…" }: LoadingScreenProps) {
  return (
    <section className="loading-screen" aria-busy="true" aria-label={message}>
      <div className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </section>
  );
}
