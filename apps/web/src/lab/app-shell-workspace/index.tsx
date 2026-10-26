'use client';

import {
  useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent,
} from 'react';
import { Button, Textarea } from '@open-design/components';
import { Icon, type IconName } from '../../components/Icon';
import {
  COLLAPSED_WIDTHS, FRAME_GAP, PANE_SIZES, fitPanes, shellMode, resizeWidth, widthForKey,
  type PaneSide, type PaneSize, type PaneState,
} from './pane-size';
import styles from './workspace.module.css';

const tools: ReadonlyArray<{ id: string; label: string; icon: IconName; shortcut: string }> = [
  { id: 'terminal', label: 'Terminal', icon: 'terminal', shortcut: '⌃`' },
  { id: 'browser', label: 'Browser', icon: 'globe', shortcut: '⌘⇧B' },
  { id: 'notes', label: 'Notes', icon: 'edit', shortcut: '⌘⇧N' },
];
const sources: ReadonlyArray<{ id: string; title: string; source: string; mark: string }> = [
  { id: 'geo', title: 'GEO: Generative Engine Optimization', source: 'arxiv.org', mark: 'A' },
  { id: 'tokens', title: 'Design tokens – naming guide', source: 'notion.so', mark: 'N' },
  { id: 'q3', title: 'Q3 launch checklist', source: 'linear.app', mark: 'L' },
];
const navigation: ReadonlyArray<{ label: string; icon: IconName }> = [
  { label: 'New chat', icon: 'edit' },
  { label: 'Folders', icon: 'folder' },
  { label: 'Integrations', icon: 'puzzle' },
];
const projects: ReadonlyArray<string> = ['Website refresh', 'Brand foundations', 'Product launch'];

function paneId(side: PaneSide) {
  return `lab-${side}`;
}

function ResizeEdge({ side, pane, size, onResize }: {
  side: PaneSide;
  pane: PaneState;
  size: PaneSize;
  onResize: (width: number) => void;
}) {
  const drag = useRef<{ pointerId: number; x: number; width: number } | null>(null);
  const edge = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!pane.collapsed || !drag.current) return;
    const { pointerId } = drag.current;
    drag.current = null;
    if (edge.current?.hasPointerCapture(pointerId)) edge.current.releasePointerCapture(pointerId);
  }, [pane.collapsed]);

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={edge}
      className={`${styles.resizeEdge} ${side === 'workspace' ? styles.rightEdge : ''}`}
      role="separator"
      aria-label={`Resize ${side}`}
      aria-controls={paneId(side)}
      aria-orientation="vertical"
      aria-valuenow={pane.width}
      aria-valuemin={size.min}
      aria-valuemax={size.max}
      aria-valuetext={`${pane.width} pixels`}
      tabIndex={pane.collapsed ? -1 : 0}
      title="Drag or use arrow keys to resize. Shift for larger steps. Double-click to reset."
      onKeyDown={(event) => {
        const width = widthForKey(pane.width, event.key, event.shiftKey, side, size);
        if (width === undefined) return;
        event.preventDefault();
        onResize(width);
      }}
      onDoubleClick={() => onResize(size.default)}
      onPointerDown={(event) => {
        if (pane.collapsed || event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, x: event.clientX, width: pane.width };
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (pane.collapsed || !start || start.pointerId !== event.pointerId) return;
        const width = resizeWidth(start.width, event.clientX - start.x, side, size);
        onResize(width);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={() => { drag.current = null; }}
    />
  );
}

function WorkspacePanel({ onOpen }: { onOpen: (label: string) => void }) {
  const [query, setQuery] = useState('');
  const toolsHeading = useId();
  const suggestedHeading = useId();
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
      <section className={styles.section} aria-labelledby={toolsHeading}>
        <h3 id={toolsHeading} className={styles.label}>Tools</h3>
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
      <section className={styles.section} aria-labelledby={suggestedHeading}>
        <h3 id={suggestedHeading} className={styles.label}>Suggested</h3>
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
  const [sidebar, setSidebar] = useState<PaneState>({ width: PANE_SIZES.sidebar.default, collapsed: false });
  const [workspace, setWorkspace] = useState<PaneState>({ width: PANE_SIZES.workspace.default, collapsed: false });
  const [active, setActive] = useState('Website refresh');
  const [notice, setNotice] = useState('');
  const drawerClose = useRef<HTMLButtonElement>(null);
  const sidebarClose = useRef<HTMLButtonElement>(null);
  const overlayFocus = useRef<{ side: PaneSide; element: HTMLElement; pending: boolean } | null>(null);
  const shell = useRef<HTMLElement>(null);
  const sidebarElement = useRef<HTMLElement>(null);
  const workspaceElement = useRef<HTMLElement>(null);
  const pageElement = useRef<HTMLElement>(null);
  const [containerWidth, setContainerWidth] = useState(1440);
  const mode = shellMode(containerWidth);
  const narrow = mode !== 'docked';
  const overlay = narrow && !workspace.collapsed ? 'workspace'
    : mode === 'compact' && !sidebar.collapsed ? 'sidebar' : null;
  const fitted = fitPanes(containerWidth, mode, sidebar, workspace);

  useLayoutEffect(() => {
    const element = shell.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      setContainerWidth(element.getBoundingClientRect().width - parseFloat(style.borderLeftWidth || '0') - parseFloat(style.borderRightWidth || '0'));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (mode !== 'docked') setWorkspace((current) => ({ ...current, collapsed: true }));
    if (mode === 'compact') setSidebar((current) => ({ ...current, collapsed: true }));
  }, [mode]);

  useLayoutEffect(() => {
    sidebarElement.current?.toggleAttribute('inert', sidebar.collapsed || overlay === 'workspace');
    workspaceElement.current?.toggleAttribute('inert', workspace.collapsed || overlay === 'sidebar');
    pageElement.current?.toggleAttribute('inert', overlay !== null);
    const focus = overlayFocus.current;
    if (!focus) return;
    if (focus.side !== overlay) {
      focus.element.focus();
      overlayFocus.current = null;
    } else if (focus.pending) {
      (overlay === 'workspace' ? drawerClose : sidebarClose).current?.focus();
      focus.pending = false;
    }
  }, [sidebar.collapsed, workspace.collapsed, overlay]);

  function togglePane(side: PaneSide) {
    const pane = side === 'sidebar' ? sidebar : workspace;
    if (pane.collapsed && (side === 'workspace' ? narrow : mode === 'compact')) {
      overlayFocus.current = { side, element: document.activeElement as HTMLElement, pending: true };
      if (side === 'workspace' && mode === 'compact') setSidebar((current) => ({ ...current, collapsed: true }));
      if (side === 'sidebar') setWorkspace((current) => ({ ...current, collapsed: true }));
    }
    (side === 'sidebar' ? setSidebar : setWorkspace)((current) => ({ ...current, collapsed: !current.collapsed }));
  }

  function closeOverlay() {
    if (overlay) (overlay === 'sidebar' ? setSidebar : setWorkspace)((current) => ({ ...current, collapsed: true }));
  }

  function resizePane(side: PaneSide, width: number) {
    setSidebar((current) => ({ ...current, width: side === 'sidebar' ? width : fitted.sidebar.width }));
    setWorkspace((current) => ({ ...current, width: side === 'workspace' ? width : fitted.workspace.width }));
  }

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]',
    )).filter((element) => {
      if (element.matches(':disabled, [tabindex="-1"], input[type="hidden"], [contenteditable="false"]') || element.closest('[hidden], [inert]')) return false;
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      }
      return true;
    });
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <section
      ref={shell}
      className={styles.shell}
      aria-label="App shell workspace experiment"
      data-mode={mode}
      style={{
        '--sidebar-width': `${fitted.sidebar.width}px`, '--workspace-width': `${fitted.workspace.width}px`,
        '--sidebar-collapsed-width': `${COLLAPSED_WIDTHS.sidebar}px`, '--workspace-collapsed-width': `${COLLAPSED_WIDTHS.workspace}px`,
        '--frame-gap': `${FRAME_GAP}px`,
      } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && overlay) {
          event.preventDefault();
          closeOverlay();
        }
      }}
    >
      <header className={styles.toolbar}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-controls={paneId('sidebar')}
          aria-expanded={!sidebar.collapsed}
          onClick={() => togglePane('sidebar')}
        >
          <Icon name="panel-left" size={18} aria-hidden="true" />
        </Button>
        <span className={styles.breadcrumb}>OpenDesign <span>/</span> <strong>{active}</strong></span>
        <div className={styles.toolbarEnd}>
          <span className={styles.workspaceTitle}>Workspace</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={workspace.collapsed ? 'Expand workspace' : 'Collapse workspace'}
            aria-controls={paneId('workspace')}
            aria-expanded={!workspace.collapsed}
            onClick={() => togglePane('workspace')}
          >
            <Icon name="layout-right" size={18} aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div className={styles.body}>
        <aside
          ref={sidebarElement}
          id={paneId('sidebar')}
          aria-label="Sidebar"
          role={mode === 'compact' ? 'dialog' : undefined}
          aria-modal={overlay === 'sidebar' ? true : undefined}
          onKeyDown={overlay === 'sidebar' ? trapFocus : undefined}
          className={`${styles.sidebar} ${sidebar.collapsed ? styles.sidebarCollapsed : ''}`}
        >
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarDrawerHeader}>
              <h2>Sidebar</h2>
              <Button ref={sidebarClose} variant="ghost" size="icon" aria-label="Close sidebar" onClick={closeOverlay}>
                <Icon name="close" size={18} aria-hidden="true" />
              </Button>
            </div>
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
          {!narrow && <ResizeEdge side="sidebar" pane={{ ...sidebar, width: fitted.sidebar.width }} size={fitted.sidebar.size} onResize={(width) => resizePane('sidebar', width)} />}
        </aside>
        <section ref={pageElement} className={styles.page} aria-label="Conversation">
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
        </section>
        <button
          type="button"
          aria-label={`Close ${overlay ?? 'workspace'} drawer`}
          tabIndex={-1}
          className={`${styles.scrim} ${overlay ? '' : styles.scrimHidden}`}
          onClick={closeOverlay}
        />
        <aside
          ref={workspaceElement}
          id={paneId('workspace')}
          aria-label="Workspace"
          className={`${styles.workspace} ${workspace.collapsed ? styles.workspaceCollapsed : ''}`}
          role={narrow ? 'dialog' : undefined}
          aria-modal={overlay === 'workspace' ? true : undefined}
          onKeyDown={overlay === 'workspace' ? trapFocus : undefined}
        >
          {!narrow && <ResizeEdge side="workspace" pane={{ ...workspace, width: fitted.workspace.width }} size={fitted.workspace.size} onResize={(width) => resizePane('workspace', width)} />}
          <div className={styles.workspaceInner}>
            <div className={styles.drawerHeader}>
              <h2>Workspace</h2>
              <Button ref={drawerClose} variant="ghost" size="icon" aria-label="Close workspace" onClick={closeOverlay}>
                <Icon name="close" size={18} aria-hidden="true" />
              </Button>
            </div>
            <WorkspacePanel onOpen={(label) => setNotice(`${label} selected in this local layout preview.`)} />
            <p className={styles.panelHint}>Everything you need,<br />right where you’re working.</p>
          </div>
        </aside>
      </div>
      <div className={`${styles.notice} accordion-collapsible ${notice ? styles.noticeOpen : ''}`} role="status">
        <div className="accordion-collapsible-inner"><p>{notice}</p></div>
      </div>
    </section>
  );
}
