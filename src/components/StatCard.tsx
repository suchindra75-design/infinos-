import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  desc?: string;
  icon?: string;
  iconBg?: string;
  valueColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  desc,
  icon,
  iconBg = 'rgba(255, 107, 53, 0.09)',
  valueColor = 'var(--text)',
}) => {
  return (
    <div className="group relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-[14px_14px_12px] transition-[transform,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[rgba(255,107,53,0.25)] select-none">
      {/* Top accent hover gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--orange)] to-transparent opacity-0 group-hover:opacity-100 transition-[opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]" />

      {/* Icon Badge */}
      {icon && (
        <div
          className="absolute top-3 right-3 w-[30px] h-[30px] rounded-lg flex items-center justify-center text-sm"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="text-[0.62rem] font-semibold text-[var(--muted)] uppercase tracking-[0.07em] truncate min-w-0">
        {label}
      </div>
      <div
        className="font-display text-[1.6rem] font-bold tracking-tighter my-1 leading-none truncate min-w-0"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {desc && <div className="text-[0.65rem] text-[var(--muted)] truncate min-w-0">{desc}</div>}
    </div>
  );
};
