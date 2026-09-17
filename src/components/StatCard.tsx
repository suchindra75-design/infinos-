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
  iconBg = 'rgba(252, 71, 49, 0.08)',
  valueColor = '#171512',
}) => {
  return (
    <div className="group relative overflow-hidden bg-[#FFF9EF] border border-[#171512]/10 rounded-2xl p-[16px_16px_14px] transition-[transform,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[#FC4731]/30 hover:shadow-md hover:shadow-[#171512]/05 select-none">
      {/* Top accent hover gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FC4731] to-transparent opacity-0 group-hover:opacity-100 transition-[opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]" />

      {/* Icon Badge */}
      {icon && (
        <div
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="text-[0.65rem] font-bold text-[#7B746A] uppercase tracking-widest truncate min-w-0 font-display">
        {label}
      </div>
      <div
        className="font-data text-[1.65rem] font-bold tracking-tight my-1 leading-none truncate min-w-0"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {desc && <div className="text-[0.68rem] font-medium text-[#7B746A] truncate min-w-0">{desc}</div>}
    </div>
  );
};
