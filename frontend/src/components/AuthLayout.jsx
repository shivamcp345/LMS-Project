import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}) {
  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <Logo dark />
        <div className="auth-visual__content">
          <span className="eyebrow">LEARN • GROW • ACHIEVE</span>
          <h2>{eyebrow}</h2>
          <p>
            Build skills that move you forward. Learn at your own pace with
            courses designed for real progress.
          </p>
          <div className="auth-visual__stats">
            <div>
              <strong>120+</strong>
              <span>Courses</span>
            </div>
            <div>
              <strong>18k+</strong>
              <span>Learners</span>
            </div>
            <div>
              <strong>94%</strong>
              <span>Completion</span>
            </div>
          </div>
        </div>
        <div className="auth-visual__foot">
          ✦ Your learning journey starts here.
        </div>
      </aside>
      <main className="auth-form-side">
        <ThemeToggle className="auth-theme-toggle" />
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <Logo />
          </div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {subtitle && <p className="auth-card__sub">{subtitle}</p>}
          <div className="auth-card__form">{children}</div>
          {footer && <div className="auth-card__foot">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
