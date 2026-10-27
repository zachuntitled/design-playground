import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  ArrowDown01Icon, ArrowRight01Icon, ArrowUp01Icon, ArrowUpRight01Icon,
  Cancel01Icon, CommandLineIcon, DashboardSquare02Icon, File02Icon,
  Folder01Icon, FolderOpenIcon, Globe02Icon, MoreHorizontalIcon,
  NoteEditIcon, PencilEdit02Icon, Search01Icon, SidebarLeftIcon, SidebarRightIcon,
} from '@hugeicons/core-free-icons';

const glyphs = {
  newChat: PencilEdit02Icon,
  folders: Folder01Icon,
  integrations: DashboardSquare02Icon,
  project: FolderOpenIcon,
  search: Search01Icon,
  sidebarLeft: SidebarLeftIcon,
  sidebarRight: SidebarRightIcon,
  terminal: CommandLineIcon,
  browser: Globe02Icon,
  notes: NoteEditIcon,
  more: MoreHorizontalIcon,
  arrowUpRight: ArrowUpRight01Icon,
  arrowUp: ArrowUp01Icon,
  chevronDown: ArrowDown01Icon,
  chevronRight: ArrowRight01Icon,
  close: Cancel01Icon,
  file: File02Icon,
} as const satisfies Record<string, IconSvgElement>;

export type IconRole = keyof typeof glyphs;

export function ShellIcon({ name, size = 16 }: { name: IconRole; size?: number }) {
  return <HugeiconsIcon icon={glyphs[name]} size={size} strokeWidth={1.9} aria-hidden="true" />;
}
