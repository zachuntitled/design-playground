import type { IconRole } from './icons';

type NavigationItem = Readonly<{ label: string; icon: IconRole }>;
type WorkspaceTool = Readonly<{ id: string; label: string; icon: IconRole; shortcut: string }>;
type Source = Readonly<{ id: string; title: string; source: string; mark: string }>;
type NewsItem = Readonly<{ id: string; title: string }>;
type SetupGroup = Readonly<{ title: string; tasks: ReadonlyArray<{ id: string; label: string; done: boolean }> }>;

export const navigation: readonly NavigationItem[] = [
  { label: 'New design', icon: 'newChat' },
  { label: 'Folders', icon: 'folders' },
  { label: 'Integrations', icon: 'integrations' },
];
export const projects: readonly NavigationItem[] = [
  { label: 'Website refresh', icon: 'project' },
  { label: 'Brand foundations', icon: 'project' },
  { label: 'Product launch', icon: 'project' },
];
export const tools: readonly WorkspaceTool[] = [
  { id: 'terminal', label: 'Terminal', icon: 'terminal', shortcut: '⌃`' },
  { id: 'browser', label: 'Browser', icon: 'browser', shortcut: '⌘⇧B' },
  { id: 'notes', label: 'Notes', icon: 'notes', shortcut: '⌘⇧N' },
];
export const sources: readonly Source[] = [
  { id: 'geo', title: 'GEO: Generative Engine Optimization', source: 'arxiv.org', mark: 'A' },
  { id: 'tokens', title: 'Design tokens – naming guide', source: 'notion.so', mark: 'N' },
  { id: 'q3', title: 'Q3 launch checklist', source: 'linear.app', mark: 'L' },
];
export const changelog: readonly NewsItem[] = [
  { id: 'shared', title: 'Shared folders' },
  { id: 'scheduled', title: 'Scheduled chats' },
];
export const setup: readonly SetupGroup[] = [
  { title: 'Set up your workspace', tasks: [
    { id: 'name', label: 'Name your workspace', done: true },
    { id: 'invite', label: 'Invite your teammates', done: false },
    { id: 'connect', label: 'Connect your first app', done: false },
  ] },
  { title: 'Start working', tasks: [
    { id: 'folder', label: 'Create a folder', done: false },
    { id: 'chat', label: 'Start your first chat', done: false },
    { id: 'upload', label: 'Upload a file', done: false },
  ] },
  { title: 'Make it yours', tasks: [
    { id: 'avatar', label: 'Add a profile picture', done: false },
    { id: 'notify', label: 'Choose your notifications', done: false },
  ] },
];
