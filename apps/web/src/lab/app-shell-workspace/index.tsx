'use client';

import {
  useRef, useState, type CSSProperties, type Dispatch, type PointerEvent, type SetStateAction,
} from 'react';
import { Button, Textarea } from '@open-design/components';
import { Icon, type IconName } from '../../components/Icon';
import { PANE_SIZES, resetWidth, resizeWidth, widthForKey, type PaneSide, type PaneState } from './pane-size';
import styles from './workspace.module.css';

const tools: ReadonlyArray<{ id: string; label: string; icon: IconName; shortcut: string }> = [
  { id: 'terminal', label: 'Terminal', icon: 'terminal', shortcut: '⌃`' },
  { id: 'browser', label: 'Browser', icon: 'globe', shortcut: '⌘⇧B' },
  { id: 'notes', label: 'Notes', icon: 'edit', shortcut: '⌘⇧N' },
];
const sources = [
  { id: 'geo', title: 'GEO: Generative Engine Optimization', source: 'arxiv.org', mark: 'A' },
  { id: 'tokens', title: 'Design tokens – naming guide', source: 'notion.so', mark: 'N' },
  { id: 'q3', title: 'Q3 launch checklist', source: 'linear.app', mark: 'L' },
];
const navigation: ReadonlyArray<{ label: string; icon: IconName }> = [
  { label: 'New chat', icon: 'edit' },
  { label: 'Folders', icon: 'folder' },
  { label: 'Integrations', icon: 'puzzle' },
];
const projects = ['Website refresh', 'Brand foundations', 'Product launch'];

function ResizeEdge({ side, pane, setPane }: {
  side: PaneSide;
  pane: PaneState;
  setPane: Dispatch<SetStateAction<PaneState>>;
}) {
  const drag = useRef<{ pointerId: number; x: number; width: number } | null>(null);
  const size = PANE_SIZES[side];

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className={`${styles.resizeEdge} ${side === 'workspace' ? styles.rightEdge : ''}`}
      role="separator"
      aria-label={`Resize ${side}`}
      aria-controls={`lab-${side}`}
      aria-orientation="vertical"
      aria-valuenow={pane.width}
      aria-valuemin={size.min}
      aria-valuemax={size.max}
      aria-valuetext={`${pane.width} pixels`}
      tabIndex={pane.collapsed ? -1 : 0}
      title="Drag or use arrow keys to resize. Shift for larger steps. Double-click to reset."
      onKeyDown={(event) => {
        const width = widthForKey(pane.width, event.key, event.shiftKey, side);
        if (width === undefined) return;
        event.preventDefault();
        setPane((current) => ({ ...current, width }));
      }}
      onDoubleClick={() => setPane((current) => ({ ...current, width: resetWidth(side) }))}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, x: event.clientX, width: pane.width };
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const width = resizeWidth(start.width, event.clientX - start.x, side);
        setPane((current) => ({ ...current, width }));
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={() => { drag.current = null; }}
    />
  );
}

function WorkspacePanel({ onOpen }: { onOpen: (label: string) => void }) {
  const [query, setQuery] = useState('');
  return (
    <div className={styles.panel}>
      <label className={styles.address}>
        <Icon name="search" size={14} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search or enter URL"
          aria-label="Search or enter URL"
        />
      </label>
      <section className={styles.section} aria-label="Tools">
        <h3 className={styles.label}>Tools</h3>
        <div className={styles.list}>
          {tools.map((tool) => (
            <div key={tool.id} className={styles.row}>
              <button type="button" className={styles.open} onClick={() => onOpen(tool.label)}>
                <span className={styles.tile}><Icon name={tool.icon} size={15} aria-hidden="true" /></span>
                <span className={styles.name}>{tool.label}</span>
                <kbd className={styles.kbd}>{tool.shortcut}</kbd>
              </button>
              <button type="button" className={styles.more} aria-label={`More for ${tool.label}`} onClick={() => onOpen(`${tool.label} options`)}>
                <Icon name="more-horizontal" size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.section} aria-label="Suggested">
        <h3 className={styles.label}>Suggested</h3>
        <div className={styles.list}>
          {sources.map((item) => (
            <button key={item.id} type="button" className={`${styles.row} ${styles.open} ${styles.source}`} onClick={() => onOpen(item.title)}>
              <span className={`${styles.tile} ${styles.mark}`}>{item.mark}</span>
              <span className={styles.sourceText}>
                <span className={styles.name}>{item.title}</span>
                <span className={styles.meta}>{item.source}</span>
              </span>
              <span className={styles.go}><Icon name="external-link" size={14} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AppShellWorkspaceExperiment() {
  const [sidebar, setSidebar] = useState<PaneState>({ width: resetWidth('sidebar'), collapsed: false });
  const [workspace, setWorkspace] = useState<PaneState>({ width: resetWidth('workspace'), collapsed: false });
  const [active, setActive] = useState('Website refresh');
  const [notice, setNotice] = useState('');
  const workspaceToggle = useRef<HTMLButtonElement>(null);

  function closeWorkspace() {
    setWorkspace((current) => ({ ...current, collapsed: true }));
    workspaceToggle.current?.focus();
  }

  return (
    <section
      className={styles.shell}
      aria-label="App shell workspace experiment"
      style={{ '--sidebar-width': `${sidebar.width}px`, '--workspace-width': `${workspace.width}px` } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !workspace.collapsed) {
          event.preventDefault();
          closeWorkspace();
        }
      }}
    >
      <header className={styles.toolbar}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-controls="lab-sidebar"
          aria-expanded={!sidebar.collapsed}
          onClick={() => setSidebar((current) => ({ ...current, collapsed: !current.collapsed }))}
        >
          <Icon name="panel-left" size={18} aria-hidden="true" />
        </Button>
        <span className={styles.breadcrumb}>OpenDesign <span>/</span> <strong>{active}</strong></span>
        <div className={styles.toolbarEnd}>
          <span className={styles.workspaceTitle}>Workspace</span>
          <Button
            ref={workspaceToggle}
            variant="ghost"
            size="icon"
            aria-label={workspace.collapsed ? 'Expand workspace' : 'Collapse workspace'}
            aria-controls="lab-workspace"
            aria-expanded={!workspace.collapsed}
            onClick={() => setWorkspace((current) => ({ ...current, collapsed: !current.collapsed }))}
          >
            <Icon name="layout-right" size={18} aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div className={styles.body}>
        <aside
          id="lab-sidebar"
          aria-label="Sidebar"
          className={`${styles.sidebar} ${sidebar.collapsed ? styles.sidebarCollapsed : ''}`}
          inert={sidebar.collapsed}
        >
          <div className={styles.sidebarInner}>
            <div className={styles.identity}>
              <span className={styles.logo}>O</span><strong>OpenDesign</strong>
              <Icon name="chevron-down" aria-hidden="true" />
            </div>
            <nav aria-label="Main navigation" className={styles.nav}>
              {navigation.map((item) => (
                <button
                  type="button" key={item.label} className={styles.navItem}
                  aria-current={active === item.label ? 'page' : undefined}
                  onClick={() => setActive(item.label)}
                >
                  <Icon name={item.icon} size={17} aria-hidden="true" />{item.label}
                </button>
              ))}
            </nav>
            <div className={styles.projects}>
              <h3 className={styles.label}>Projects</h3>
              {projects.map((project) => (
                <button
                  type="button" key={project} className={styles.navItem}
                  aria-current={active === project ? 'page' : undefined}
                  onClick={() => setActive(project)}
                >
                  <Icon name="comment" size={16} aria-hidden="true" /><span>{project}</span>
                </button>
              ))}
            </div>
            <div className={styles.account}>
              <span className={styles.avatar}>ZM</span>
              <div><strong>Zach Morgan</strong><span>Personal workspace</span></div>
              <Icon name="chevron-down" aria-hidden="true" />
            </div>
          </div>
          <ResizeEdge side="sidebar" pane={sidebar} setPane={setSidebar} />
        </aside>
        <section className={styles.page} aria-label="Conversation">
          <div className={styles.pageHeader}>
            <span><Icon name="comment" size={15} aria-hidden="true" /> {active}</span>
            <span className={styles.draft}>Draft</span>
          </div>
          <div className={styles.conversation}>
            <span className={styles.eyebrow}>A PLACE TO THINK, TOGETHER</span>
            <h2>A little more room<br />for your next idea.</h2>
            <p className={styles.intro}>Bring your research, tools, and conversation into one focused workspace.</p>
            <article className={styles.message} aria-label="Your message">
              <span className={styles.messageAvatar}>ZM</span>
              <div>
                <h3>You <time>10:42</time></h3>
                <p>Let’s explore a calmer direction for our website. Something clear and considered, with space for the work to speak.</p>
              </div>
            </article>
            <article className={styles.message} aria-label="OpenDesign message">
              <span className={`${styles.messageAvatar} ${styles.assistantAvatar}`}>O</span>
              <div>
                <h3>OpenDesign <time>10:42</time></h3>
                <p>I’d start with a simpler frame, a quieter palette, and a stronger rhythm between each section.</p>
                <p>I’ve gathered a few references in your workspace. We can keep them beside the conversation as we shape the first direction.</p>
                <div className={styles.suggestion}>
                  <Icon name="layers-filled" size={17} aria-hidden="true" />
                  <span><strong>Website direction</strong><span>Layout exploration · 3 references</span></span>
                  <Icon name="external-link" size={15} aria-hidden="true" />
                </div>
              </div>
            </article>
          </div>
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              setNotice('Preview message received.');
            }}
          >
            <Textarea aria-label="Message OpenDesign" placeholder="What would you like to explore?" rows={2} />
            <div>
              <span>Local design preview</span>
              <Button type="submit" variant="primary" size="icon" aria-label="Send preview message">
                <Icon name="arrow-up" size={16} aria-hidden="true" />
              </Button>
            </div>
          </form>
          <p className={styles.notice} role="status">{notice || 'Your ideas, with a little space to grow.'}</p>
        </section>
        <button
          type="button"
          aria-label="Close workspace drawer"
          tabIndex={-1}
          className={`${styles.scrim} ${workspace.collapsed ? styles.scrimHidden : ''}`}
          onClick={closeWorkspace}
        />
        <aside
          id="lab-workspace"
          aria-label="Workspace"
          className={`${styles.workspace} ${workspace.collapsed ? styles.workspaceCollapsed : ''}`}
          inert={workspace.collapsed}
        >
          <ResizeEdge side="workspace" pane={workspace} setPane={setWorkspace} />
          <div className={styles.workspaceInner}>
            <div className={styles.drawerHeader}>
              <h2>Workspace</h2>
              <Button variant="ghost" size="icon" aria-label="Close workspace" onClick={closeWorkspace}>
                <Icon name="close" size={18} aria-hidden="true" />
              </Button>
            </div>
            <WorkspacePanel onOpen={(label) => setNotice(`${label} selected in this local layout preview.`)} />
            <p className={styles.panelHint}>Everything you need,<br />right where you’re working.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
