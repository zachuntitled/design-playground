'use client';

import {
  useId, useLayoutEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent,
} from 'react';
import { ShellIcon } from './icons';
import { changelog, navigation, projects, setup, sources, tools } from './content';
import {
  COLLAPSED_WIDTHS, FRAME_GAP, fitPanes, shellMode, resizeWidth, widthForKey,
  type PaneSide, type PaneSize, type PaneState,
} from './pane-size';
import { initialPanes, isOverlay, paneReducer } from './pane-state';
import styles from './workspace.module.css';
import theme from './theme.module.css';

function paneId(side: PaneSide) {
  return `lab-${side}`;
}

function ResizeEdge({ side, pane, size, onResize, onReset }: {
  side: PaneSide;
  pane: PaneState;
  size: PaneSize;
  onResize: (width: number) => void;
  onReset: () => void;
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
      onDoubleClick={onReset}
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
        <ShellIcon name="search" size={14} aria-hidden="true" />
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
                <span className={styles.tile}><ShellIcon name={tool.icon} size={15} aria-hidden="true" /></span>
                <span className={styles.name}>{tool.label}</span>
                <kbd className={styles.kbd}>{tool.shortcut}</kbd>
              </button>
              <button type="button" className={styles.more} aria-label={`More for ${tool.label}`} onClick={() => onOpen(`${tool.label} options`)}>
                <ShellIcon name="more" size={15} aria-hidden="true" />
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
              <span className={styles.go}><ShellIcon name="arrowUpRight" size={14} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AppShellWorkspaceExperiment() {
  const [panes, dispatch] = useReducer(paneReducer, initialPanes);
  const { sidebar, workspace, mode } = panes;
  const [active, setActive] = useState('New chat');
  const [newsIndex, setNewsIndex] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const dismissButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const newsFocusPending = useRef(false);
  const setupSummary = useRef<HTMLButtonElement>(null);
  const setupDetails = useRef<HTMLDivElement>(null);
  const [completed, setCompleted] = useState(() => setup.flatMap((group) => group.tasks.filter((task) => task.done).map((task) => task.id)));
  const setupProgress = Math.round(completed.length / setup.reduce((count, group) => count + group.tasks.length, 0) * 100);
  const [notice, setNotice] = useState('');
  const toolbar = useRef<HTMLElement>(null);
  const sidebarToggle = useRef<HTMLButtonElement>(null);
  const workspaceToggle = useRef<HTMLButtonElement>(null);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const sidebarClose = useRef<HTMLButtonElement>(null);
  const overlayFocus = useRef<HTMLButtonElement | null>(null);
  const measuredMode = useRef(initialPanes.mode);
  const modeChangeFocus = useRef<{ side: PaneSide; element: Element } | null>(null);
  const shell = useRef<HTMLElement>(null);
  const sidebarElement = useRef<HTMLElement>(null);
  const workspaceElement = useRef<HTMLElement>(null);
  const pageElement = useRef<HTMLElement>(null);
  const [containerWidth, setContainerWidth] = useState(1440);
  const narrow = isOverlay(mode);
  const overlay = narrow && !workspace.collapsed ? 'workspace'
    : narrow && !sidebar.collapsed ? 'sidebar' : null;
  const fitted = fitPanes(containerWidth, sidebar, workspace, panes.lastResized);

  useLayoutEffect(() => {
    const element = shell.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      const width = element.getBoundingClientRect().width - parseFloat(style.borderLeftWidth || '0') - parseFloat(style.borderRightWidth || '0');
      const nextMode = shellMode(width);
      if (nextMode !== measuredMode.current) {
        const focused = document.activeElement;
        const side = sidebarElement.current?.contains(focused) ? 'sidebar'
          : workspaceElement.current?.contains(focused) ? 'workspace' : null;
        modeChangeFocus.current = side && focused ? { side, element: focused } : null;
      }
      setContainerWidth(width);
      measuredMode.current = nextMode;
      dispatch({ type: 'modeChanged', mode: nextMode });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const priorFocus = modeChangeFocus.current;
    modeChangeFocus.current = null;
    toolbar.current?.toggleAttribute('inert', overlay !== null);
    for (const side of ['sidebar', 'workspace'] as const) {
      const element = (side === 'sidebar' ? sidebarElement : workspaceElement).current;
      if ((panes[side].collapsed && element?.contains(document.activeElement))
        || (priorFocus?.side === side && (panes[side].collapsed || !priorFocus.element.isConnected || priorFocus.element.closest('[hidden]')))) {
        (side === 'sidebar' ? sidebarToggle : workspaceToggle).current?.focus({ preventScroll: true });
      }
      element?.toggleAttribute('inert', !!panes[side].collapsed || (overlay !== null && overlay !== side));
    }
    pageElement.current?.toggleAttribute('inert', overlay !== null);
    overlayFocus.current?.focus({ preventScroll: true });
    overlayFocus.current = null;
  }, [panes, overlay]);

  useLayoutEffect(() => {
    if (!newsFocusPending.current) return;
    newsFocusPending.current = false;
    (dismissButtons.current[newsIndex] ?? setupSummary.current)?.focus({ preventScroll: true });
  }, [newsIndex]);

  function togglePane(side: PaneSide) {
    if (narrow) {
      overlayFocus.current = panes[side].collapsed
        ? (side === 'sidebar' ? sidebarClose : drawerClose).current
        : (side === 'sidebar' ? sidebarToggle : workspaceToggle).current;
    }
    dispatch({ type: 'toggle', side });
  }

  function closeOverlay() {
    if (!overlay) return;
    overlayFocus.current = (overlay === 'sidebar' ? sidebarToggle : workspaceToggle).current;
    dispatch({ type: 'close', side: overlay });
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
      className={`${theme.theme} ${styles.shell}`}
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
      <header ref={toolbar} className={styles.toolbar}>
        <button className={`${styles.iconButton} ${styles.sidebarToggle}`}
          aria-label={sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          ref={sidebarToggle}
          aria-controls={paneId('sidebar')}
          aria-expanded={!sidebar.collapsed}
          onClick={() => togglePane('sidebar')}
        >
          <ShellIcon name="sidebarLeft" size={16} aria-hidden="true" />
        </button>
        <span className={styles.breadcrumb}>OpenDesign <span>/</span> <strong>{active}</strong></span>
        <div className={styles.toolbarEnd}>
          <span className={styles.workspaceTitle}>Workspace</span>
          <button className={`${styles.iconButton} ${styles.workspaceToggle}`}
            aria-label={workspace.collapsed ? 'Expand workspace' : 'Collapse workspace'}
            ref={workspaceToggle}
            aria-controls={paneId('workspace')}
            aria-expanded={!workspace.collapsed}
            onClick={() => togglePane('workspace')}
          >
            <ShellIcon name="sidebarRight" size={16} aria-hidden="true" />
          </button>
        </div>
      </header>
      <button
        type="button"
        aria-label={`Close ${overlay ?? 'workspace'} drawer`}
        tabIndex={-1}
        className={`${styles.scrim} ${overlay ? '' : styles.scrimHidden}`}
        onClick={closeOverlay}
      />
      <div className={styles.body}>
        <aside
          ref={sidebarElement}
          id={paneId('sidebar')}
          aria-label="Sidebar"
          role={narrow ? 'dialog' : undefined}
          aria-modal={overlay === 'sidebar' ? true : undefined}
          onKeyDown={overlay === 'sidebar' ? trapFocus : undefined}
          className={`${styles.sidebar} ${sidebar.collapsed ? styles.sidebarCollapsed : ''}`}
        >
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarDrawerHeader}>
              <h2>Sidebar</h2>
              <button ref={sidebarClose} hidden={!narrow} className={styles.iconButton} aria-label="Close sidebar" onClick={closeOverlay}>
                <ShellIcon name="sidebarLeft" size={16} />
              </button>
            </div>
            <div className={styles.sidebarHeader}>
              <button type="button" className={styles.identity} onClick={() => setNotice('OpenDesign workspace selected.')}>
                <span className={styles.logo}>O</span><strong>OpenDesign</strong>
                <ShellIcon name="chevronDown" size={12} />
              </button>
              <button type="button" className={`${styles.iconButton} ${styles.sidebarSearch}`} aria-label="Search" onClick={() => setNotice('Search selected in this local layout preview.')}>
                <ShellIcon name="search" size={16} />
              </button>
            </div>
            <nav aria-label="Main navigation" className={styles.nav}>
              {navigation.map((item) => (
                <button
                  type="button" key={item.label} className={styles.navItem}
                  aria-current={active === item.label ? 'page' : undefined}
                  onClick={() => setActive(item.label)}
                >
                  <ShellIcon name={item.icon} size={16} aria-hidden="true" />{item.label}
                </button>
              ))}
            </nav>
            <div className={styles.projects}>
              <h3 className={styles.label}>Projects</h3>
              {projects.map((project) => (
                <button
                  type="button" key={project.label} className={styles.navItem}
                  aria-current={active === project.label ? 'page' : undefined}
                  onClick={() => setActive(project.label)}
                >
                  <ShellIcon name={project.icon} size={16} /><span>{project.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.sidebarFooter}>
              <div className={styles.news} data-remaining={changelog.length - newsIndex}>
                {changelog.map((item, index) => (
                  <article key={item.id} className={styles.newsCard} data-position={index < newsIndex ? 'dismissed' : index === newsIndex ? 'front' : 'back'} aria-hidden={index !== newsIndex}>
                    <div className={styles.newsHeading}>
                      <span>New in OpenDesign</span>
                      <button type="button" className={styles.dismiss} aria-label="Dismiss" tabIndex={index === newsIndex ? 0 : -1} ref={(element) => { dismissButtons.current[index] = element; }} onClick={() => {
                        newsFocusPending.current = true;
                        setNewsIndex((value) => Math.min(value + 1, changelog.length));
                      }}>
                        <ShellIcon name="close" size={13} />
                      </button>
                    </div>
                    <strong>{item.title}</strong>
                    <button type="button" className={styles.changelog} tabIndex={index === newsIndex ? 0 : -1} onClick={() => setNotice('Shared folders and scheduled chats are new in OpenDesign.')}>
                      Full changelog<ShellIcon name="chevronRight" size={13} />
                    </button>
                  </article>
                ))}
              </div>
              <div className={styles.setupSlot}>
                <div className={styles.setupCard} data-open={setupOpen}>
                  <button type="button" className={styles.setupSummary} ref={setupSummary} aria-expanded={setupOpen} onClick={() => {
                    if (setupOpen && setupDetails.current?.contains(document.activeElement)) setupSummary.current?.focus({ preventScroll: true });
                    setSetupOpen(!setupOpen);
                  }}>
                    <span className={styles.setupTitle}>Getting started<ShellIcon name="chevronRight" size={13} /></span>
                    <span className={styles.setupSub}>{setupProgress}% done · <span>{setupProgress === 100 ? 'All done!' : setupProgress >= 60 ? 'Almost there!' : setupProgress > 0 ? 'Great start!' : "Let's go!"}</span></span>
                  </button>
                  <span className={styles.progress} role="progressbar" aria-label="Getting started progress" aria-valuenow={setupProgress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(setupProgress, 4)}%` }} /></span>
                  <div ref={setupDetails} className={styles.setupDetails} aria-hidden={!setupOpen}>
                    <div>
                      {setup.map((group) => (
                        <fieldset key={group.title}>
                          <legend>{group.title}</legend>
                          {group.tasks.map((task) => (
                            <label key={task.id}>
                              <input type="checkbox" tabIndex={setupOpen ? 0 : -1} checked={completed.includes(task.id)} onChange={(event) => setCompleted((items) => event.target.checked ? [...items, task.id] : items.filter((id) => id !== task.id))} />
                              {task.label}
                            </label>
                          ))}
                        </fieldset>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" className={styles.account} onClick={() => setNotice('Alex Morgan · Personal workspace')}>
                <span className={styles.avatar}>AM</span>
                <span>Alex Morgan</span>
                <ShellIcon name="chevronDown" size={13} />
              </button>
            </div>
          </div>
          {!narrow && <ResizeEdge side="sidebar" pane={{ ...sidebar, width: fitted.sidebar.width }} size={fitted.sidebar.size} onResize={(width) => dispatch({ type: 'resize', side: 'sidebar', width })} onReset={() => dispatch({ type: 'reset', side: 'sidebar' })} />}
        </aside>
        <section ref={pageElement} className={styles.page} aria-label="Conversation">
          <div className={styles.pageHeader}>
            <span><ShellIcon name="project" size={15} aria-hidden="true" /> {active === 'New chat' ? 'Website refresh' : active}</span>
            <span className={styles.draft}>Draft</span>
          </div>
          <div className={styles.conversation}>
            <span className={styles.eyebrow}>A PLACE TO THINK, TOGETHER</span>
            <h2>A little more room<br />for your next idea.</h2>
            <p className={styles.intro}>Bring your research, tools, and conversation into one focused workspace.</p>
            <article className={styles.message} aria-label="Your message">
              <span className={styles.messageAvatar}>AM</span>
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
                  <ShellIcon name="file" size={17} aria-hidden="true" />
                  <span><strong>Website direction</strong><span>Layout exploration · 3 references</span></span>
                  <ShellIcon name="arrowUpRight" size={15} aria-hidden="true" />
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
            <textarea aria-label="Message OpenDesign" placeholder="What would you like to explore?" rows={2} />
            <div>
              <span>Local design preview</span>
              <button type="submit" className={styles.iconButton} aria-label="Send preview message">
                <ShellIcon name="arrowUp" size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
        <aside
          ref={workspaceElement}
          id={paneId('workspace')}
          aria-label="Workspace"
          className={`${styles.workspace} ${workspace.collapsed ? styles.workspaceCollapsed : ''}`}
          role={narrow ? 'dialog' : undefined}
          aria-modal={overlay === 'workspace' ? true : undefined}
          onKeyDown={overlay === 'workspace' ? trapFocus : undefined}
        >
          {!narrow && <ResizeEdge side="workspace" pane={{ ...workspace, width: fitted.workspace.width }} size={fitted.workspace.size} onResize={(width) => dispatch({ type: 'resize', side: 'workspace', width })} onReset={() => dispatch({ type: 'reset', side: 'workspace' })} />}
          <div className={styles.workspaceInner}>
            <div className={styles.drawerHeader}>
              <h2>Workspace</h2>
              <button ref={drawerClose} hidden={!narrow} className={styles.iconButton} aria-label="Close workspace" onClick={closeOverlay}>
                <ShellIcon name="sidebarRight" size={16} />
              </button>
            </div>
            <WorkspacePanel onOpen={(label) => setNotice(`${label} selected in this local layout preview.`)} />

          </div>
        </aside>
      </div>
      <div className={`${styles.notice} accordion-collapsible ${notice ? styles.noticeOpen : ''}`} role="status">
        <div className="accordion-collapsible-inner"><p>{notice}</p></div>
      </div>
    </section>
  );
}
