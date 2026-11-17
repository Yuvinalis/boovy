interface BoovyLogoProps {
  dark?: boolean;
  size?: 'sm' | 'md';
}

export function BoovyLogo({ dark = false, size = 'md' }: BoovyLogoProps) {
  const iconSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        className={`${iconSize} rounded-lg bg-[#008060] flex items-center justify-center shadow-sm border border-white/10`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white fill-current" aria-hidden="true">
          <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h4.25a5.25 5.25 0 0 1 3.71 8.96A5.5 5.5 0 0 1 12.5 21H7.5A2.5 2.5 0 0 1 5 18.5v-14Zm4 1.5v4.25h2.75a2.125 2.125 0 1 0 0-4.25H9Zm0 7.25V18h3.5a2.375 2.375 0 1 0 0-4.75H9Z" />
        </svg>
      </div>
      <span
        className={`${textSize} font-bold tracking-tight ${
          dark ? 'text-[#F1F2F4]' : 'text-[#202223]'
        }`}
      >
        Boovy
      </span>
    </div>
  );
}
