"use client";

type AuthCardProps = {
  onLoginWithGoogle: () => void;
  onContinueAsGuest: () => void;
  loading: boolean;
  errorMessage: string | null;
};

export function AuthCard({
  onLoginWithGoogle,
  onContinueAsGuest,
  loading,
  errorMessage,
}: AuthCardProps) {
  return (
    <section className="auth-card" aria-label="Sign in to BuddyLocation">
      <h1>BuddyLocation</h1>
      <p>Sign in to unlock secure real-time sharing with your crew.</p>

      <div className="auth-card__actions">
        <button
          type="button"
          className="auth-card__button"
          onClick={onLoginWithGoogle}
          disabled={loading}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="auth-card__button auth-card__button--ghost"
          onClick={onContinueAsGuest}
          disabled={loading}
        >
          Continue as Guest
        </button>
      </div>

      {errorMessage ? <p className="auth-card__error">{errorMessage}</p> : null}
    </section>
  );
}
