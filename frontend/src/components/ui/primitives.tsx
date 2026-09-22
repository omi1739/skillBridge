'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

/* ----------------------------------------------------------------
   EmptyState — centered icon + title + subtitle + actions
   Used for loading, error, sign-in, and no-data prompts.
   ---------------------------------------------------------------- */
export type EmptyTone = 'info' | 'success' | 'warning' | 'danger' | 'accent';

export function EmptyState({
  icon: Icon,
  tone = 'info',
  title,
  subtitle,
  actions,
  className = '',
  compact = false,
}: {
  icon: LucideIcon;
  tone?: EmptyTone;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''} ${className}`.trim()}>
      <div className={`empty-state-icon empty-state-icon-${tone}`}>
        <Icon size={24} />
      </div>
      <h2 className="empty-state-title">{title}</h2>
      {subtitle && <p className="empty-state-sub">{subtitle}</p>}
      {actions && <div className="empty-state-actions">{actions}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------
   SectionCard — card with a header (title/subtitle/actions + body)
   ---------------------------------------------------------------- */
export function SectionCard({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  className = '',
  flush = false,
  bodyClassName = '',
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel ${flush ? 'panel-flush' : ''} ${className}`.trim()}>
      {(title || actions || eyebrow) && (
        <div className="panel-header">
          <div>
            {eyebrow && <div className="panel-eyebrow">{eyebrow}</div>}
            {title && <div className="panel-title">{title}</div>}
            {subtitle && <div className="panel-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="toolbar">{actions}</div>}
        </div>
      )}
      <div className={`${title || actions || eyebrow ? 'panel-body' : ''} ${bodyClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
   Field — label + control
   ---------------------------------------------------------------- */
export function Field({
  label,
  hint,
  id,
  children,
  className = '',
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

/* ----------------------------------------------------------------
   Chip — small status pill
   ---------------------------------------------------------------- */
export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export function Chip({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: ChipTone;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`chip chip-${tone} ${className}`.trim()}>{children}</span>;
}

/* ----------------------------------------------------------------
   Toolbar — horizontal action/segmented row
   ---------------------------------------------------------------- */
export function Toolbar({
  between = false,
  children,
  className = '',
}: {
  between?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`toolbar ${between ? 'toolbar-between' : ''} ${className}`.trim()}>{children}</div>;
}

/* ----------------------------------------------------------------
   Segmented control — tab-like toggle
   ---------------------------------------------------------------- */
export function Segmented({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { value: string; label: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`.trim()} role="tablist">
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`segmented-btn ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------
   ListItem — bordered row for lists/history
   ---------------------------------------------------------------- */
export function ListItem({
  children,
  compact = false,
  hover = false,
  className = '',
}: {
  children: React.ReactNode;
  compact?: boolean;
  hover?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`list-item ${compact ? 'list-item-compact' : ''} ${hover ? 'list-item-hover' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------
   Alerts
   ---------------------------------------------------------------- */
export function Alert({
  tone,
  children,
  className = '',
}: {
  tone: 'info' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`alert alert-${tone} ${className}`.trim()}>{children}</div>;
}

/* ----------------------------------------------------------------
   PageHeader — consistent page title + actions
   ---------------------------------------------------------------- */
export function PageHeader({
  title,
  subtitle,
  actions,
  kicker,
  className = '',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  kicker?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div>
        {kicker && <div className="jobs-kicker">{kicker}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="toolbar">{actions}</div>}
    </div>
  );
}