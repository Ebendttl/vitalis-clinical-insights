import { ActivityIcon, type LucideIcon, UsersRoundIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/patients", label: "Patients", icon: UsersRoundIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
];
