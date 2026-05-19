// Lucide-style stroke icons. Lightweight, drawn inline.

const Icon = ({ size = 20, stroke = "currentColor", strokeWidth = 1.75, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

const IconMapPin = (p) => (
  <Icon {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);
const IconCalendar = (p) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M16 3v3M8 3v3M3 9.5h18" />
  </Icon>
);
const IconUsers = (p) => (
  <Icon {...p}>
    <path d="M16 20v-1.5A4.5 4.5 0 0 0 11.5 14h-5A4.5 4.5 0 0 0 2 18.5V20" />
    <circle cx="9" cy="7.5" r="3.5" />
    <path d="M22 20v-1.5A4.5 4.5 0 0 0 18 14.1" />
    <path d="M15 4.1a3.5 3.5 0 0 1 0 6.8" />
  </Icon>
);
const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7.5" />
    <path d="m20 20-3.4-3.4" />
  </Icon>
);
const IconStar = ({ size = 14, filled = true, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
       stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...rest}>
    <path d="m12 2.5 2.96 6 6.6.96-4.78 4.66 1.13 6.58L12 17.7l-5.91 3 1.13-6.58L2.44 9.46l6.6-.96Z" />
  </svg>
);
const IconHeart = ({ size = 18, filled = false, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d="M19.5 12.6 12 20.2l-7.5-7.6a4.7 4.7 0 0 1 6.65-6.65L12 7l.85-1.05a4.7 4.7 0 0 1 6.65 6.65Z" />
  </svg>
);
const IconWifi = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M5 12.55a11 11 0 0 1 14 0" />
    <path d="M8.5 16.1a6 6 0 0 1 7 0" />
    <circle cx="12" cy="19" r="0.8" fill="currentColor" stroke="none" />
    <path d="M1.5 9a16 16 0 0 1 21 0" />
  </Icon>
);
const IconPool = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M2 18c1.5 1 3 1 4.5 0s3 -1 4.5 0 3 1 4.5 0 3 -1 4.5 0" />
    <path d="M2 21c1.5 1 3 1 4.5 0s3 -1 4.5 0 3 1 4.5 0 3 -1 4.5 0" />
    <path d="M6 13V6a2 2 0 0 1 4 0v9" />
    <path d="M14 13V6a2 2 0 0 1 4 0v9" />
    <path d="M6 9h12" />
  </Icon>
);
const IconSpa = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M12 21c0-5 3-9 8-9-1 4-4 9-8 9Z" />
    <path d="M12 21c0-5-3-9-8-9 1 4 4 9 8 9Z" />
    <path d="M12 21V8a4 4 0 1 1 0-2 4 4 0 1 1 0 2Z" />
  </Icon>
);
const IconBreakfast = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M4 8h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
    <path d="M18 8h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
    <path d="M8 5c0-1 1-1 1-2M12 5c0-1 1-1 1-2" />
  </Icon>
);
const IconGlobe = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Icon>
);
const IconChevron = (p) => (
  <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
);
const IconArrow = (p) => (
  <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>
);
const IconShield = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);
const IconTag = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M20.5 13.5 13 21a2 2 0 0 1-2.8 0L3 13.8V4h9.8l7.7 7.7a1.3 1.3 0 0 1 0 1.8Z" />
    <circle cx="8" cy="9" r="1.6" fill="currentColor" stroke="none" />
  </Icon>
);
const IconHeadset = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M4 14a8 8 0 1 1 16 0" />
    <rect x="3" y="13" width="4" height="7" rx="1.5" />
    <rect x="17" y="13" width="4" height="7" rx="1.5" />
    <path d="M21 18v1a3 3 0 0 1-3 3h-2" />
  </Icon>
);
const IconRefresh = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
);
const IconInstagram = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
  </Icon>
);
const IconX = (p) => (
  <Icon {...p} strokeWidth="1.8">
    <path d="m4 4 16 16M20 4 4 20" />
  </Icon>
);
const IconYoutube = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <rect x="2.5" y="6" width="19" height="12" rx="3" />
    <path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor" stroke="none" />
  </Icon>
);
const IconFb = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M15 4h-2.5A3.5 3.5 0 0 0 9 7.5V10H7v3h2v8h3v-8h2.5l.5-3H12V8a1 1 0 0 1 1-1h2Z" />
  </Icon>
);

const IconRestaurant = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M5 3v8a2 2 0 0 0 2 2v8M7 3v8M9 3v8" />
    <path d="M16 3c-2 0-3 2-3 5s1 5 3 5v8" />
  </Icon>
);
const IconParking = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 17V7h3.5a3 3 0 0 1 0 6H9" />
  </Icon>
);
const IconBar = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M4 4h16l-7 9v6h3M11 19H8M3 4l1.5 3M21 4l-1.5 3" />
  </Icon>
);
const IconBell = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);
const IconClock = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const IconCheck = (p) => (
  <Icon {...p} strokeWidth="2">
    <path d="m4 12 5 5L20 6" />
  </Icon>
);
const IconShare = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" />
    <path d="m8 11 8-5M8 13l8 5" />
  </Icon>
);

const IconUserCircle = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <circle cx="12" cy="9" r="3.5" />
    <path d="M5.5 19a7 7 0 0 1 13 0" />
    <circle cx="12" cy="12" r="10" />
  </Icon>
);
const IconWallet = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M16 12.5h3" />
  </Icon>
);
const IconLogout = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 16l5-4-5-4M21 12H9" />
  </Icon>
);
const IconBookmark = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M6 4h12v17l-6-4-6 4Z" />
  </Icon>
);
const IconClose = (p) => (
  <Icon {...p} strokeWidth="1.8">
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
const IconPhone = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M22 16.9v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.36 1.87.68 2.76a2 2 0 0 1-.45 2.11L8.09 9.9a16 16 0 0 0 6 6l1.31-1.31a2 2 0 0 1 2.11-.45c.89.32 1.81.55 2.76.68A2 2 0 0 1 22 16.9Z" />
  </Icon>
);
const IconChat = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
    <circle cx="8.5" cy="12" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12"   cy="12" r=".9" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="12" r=".9" fill="currentColor" stroke="none" />
  </Icon>
);
const IconPlus = (p) => (
  <Icon {...p} strokeWidth="1.8">
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
const IconLink = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </Icon>
);

Object.assign(window, {
  Icon, IconMapPin, IconCalendar, IconUsers, IconSearch, IconStar, IconHeart,
  IconWifi, IconPool, IconSpa, IconBreakfast, IconGlobe, IconChevron, IconArrow,
  IconShield, IconTag, IconHeadset, IconRefresh, IconInstagram, IconX, IconYoutube, IconFb,
  IconRestaurant, IconParking, IconBar, IconBell, IconClock, IconCheck, IconShare,
  IconUserCircle, IconWallet, IconLogout, IconBookmark, IconClose, IconPhone, IconChat, IconPlus, IconLink,
});
