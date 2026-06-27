type IconProps = { size?: number; className?: string };

function svg(size: number, className: string | undefined, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconLogout = ({ size = 15, className }: IconProps) =>
  svg(
    size,
    className,
    <path
      d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M10 12h10m0 0-3-3m3 3-3 3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
  );

export const IconUser = ({ size = 24, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.5c.7-3.2 3.3-5 6.5-5s5.8 1.8 6.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>,
  );

export const IconUserSmall = ({ size = 18, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 19c.6-3 3-4.6 6-4.6S17.4 16 18 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>,
  );

export const IconAuthorize = ({ size = 18, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 14h3v3m0 3h3v-3m-3 0h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  );

export const IconPackage = ({ size = 24, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 8.5 12 13l8-4.5M12 13v7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </>,
  );

export const IconMessage = ({ size = 24, className }: IconProps) =>
  svg(
    size,
    className,
    <path
      d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />,
  );

export const IconShield = ({ size = 24, className }: IconProps) =>
  svg(
    size,
    className,
    <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  );

export const IconAdminGrid = ({ size = 24, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </>,
  );

export const IconSend = ({ size = 20, className }: IconProps) =>
  svg(
    size,
    className,
    <path d="M3.5 12 20 5l-3 15-5.5-4.5L9 19l-.5-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  );

export const IconSearch = ({ size = 17, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>,
  );

export const IconGear = ({ size = 17, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M19 12a7 7 0 0 0-.1-1.1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.3 3h-4l-.3 2.8a7 7 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.9 1.1l.3 2.8h4l.3-2.8a7 7 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.6c.06-.36.1-.73.1-1.1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </>,
  );

export const IconCheck = ({ size = 15, className }: IconProps) =>
  svg(
    size,
    className,
    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  );

export const IconQr = ({ size = 28, className }: IconProps) =>
  svg(
    size,
    className,
    <path
      d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />,
  );

export const IconCar = ({ size = 18, className }: IconProps) =>
  svg(
    size,
    className,
    <path
      d="M4 16l1.5-5A2 2 0 0 1 7.4 9.6h9.2A2 2 0 0 1 18.5 11L20 16M4 16h16v3H4z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />,
  );

export const IconRegistered = ({ size = 18, className }: IconProps) =>
  svg(
    size,
    className,
    <>
      <path d="M5 5h14v14H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  );

export const IconBell = ({ size = 18, className }: IconProps) =>
  svg(
    size,
    className,
    <path
      d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
  );
