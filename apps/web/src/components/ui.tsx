import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { CreditCard, Home, Package, QrCode, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-semibold text-ink">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-white shadow-sm">
        <CreditCard size={18} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="leading-tight">
          Buy-a-bit
          <small className="block text-[10px] font-normal text-muted">Payments, simply</small>
        </span>
      )}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

export function Field({ label, hint, error, className = "", id, ...props }: FieldProps) {
  const fieldId = id ?? props.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;

  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      <span className="flex items-center justify-between gap-3">
        {label}
        {hint}
      </span>
      <input
        id={fieldId}
        className={`field ${error ? "field-invalid" : ""} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...props}
      />
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export function FormAlert({
  tone = "error",
  title,
  children,
}: {
  tone?: "error" | "success" | "info";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`form-alert form-alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title && <strong>{title}</strong>}
      <p>{children}</p>
    </div>
  );
}

export function StatePanel({
  icon,
  title,
  children,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="empty-state product-state-panel">
      {icon}
      <strong>{title}</strong>
      <span>{children}</span>
      {actions && <div className="product-state-actions">{actions}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: "paid" | "pending" | "failed" }) {
  const label = status === "paid" ? "Paid" : status === "pending" ? "Pending" : "Failed";
  return <span className={`status status-${status}`}>{label}</span>;
}

export function Money({ cents }: { cents: number }) {
  return (
    <>
      ${(cents / 100).toFixed(2)} <small className="text-[10px] font-medium text-muted">AUD</small>
    </>
  );
}

const mobileItems = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Products", path: "/dashboard#inventory", icon: QrCode },
  { label: "Settings", path: "/settings/payment", icon: Settings },
  { label: "Orders", path: "/dashboard?view=orders", icon: Package },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {mobileItems.map(({ label, path, icon: Icon }) => {
        const active =
          (label === "Settings" && location.pathname.startsWith("/settings")) ||
          (label === "Home" && location.pathname === "/dashboard");
        return (
          <Link key={label} to={path} className={active ? "active" : ""}>
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
