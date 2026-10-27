// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppShellWorkspaceExperiment from '../src/lab/app-shell-workspace';

let containerWidth = 1400;
let measure: () => void;

beforeEach(() => {
  containerWidth = 1400;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { measure = callback; }
    observe() {}
    disconnect() {}
  });
  const computedStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const style = computedStyle(element);
    Object.defineProperties(style, { borderLeftWidth: { value: '0px' }, borderRightWidth: { value: '0px' } });
    return style;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    width: containerWidth, height: 620, x: 0, y: 0, top: 0, left: 0, right: containerWidth, bottom: 620, toJSON() {},
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function resizeContainer(width: number) {
  act(() => { containerWidth = width; measure(); });
}

function openWorkspace() {
  const toggle = screen.getByRole('button', { name: 'Expand workspace' });
  toggle.focus();
  fireEvent.click(toggle);
  return toggle;
}

describe('lab app shell interactions', () => {
  it('makes folded panes inert and preserves workspace toggle focus', () => {
    render(<AppShellWorkspaceExperiment />);
    const workspace = screen.getByRole('complementary', { name: 'Workspace' });
    const toggle = screen.getByRole('button', { name: 'Collapse workspace' });
    toggle.focus();
    fireEvent.click(toggle);
    expect(workspace.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(toggle);
    expect(workspace.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(toggle);
    const sidebar = screen.getByRole('complementary', { name: 'Sidebar' });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(sidebar.hasAttribute('inert')).toBe(true);
  });

  it('resizes through the accessible separator and leaves desktop Escape alone', () => {
    render(<AppShellWorkspaceExperiment />);
    const edge = screen.getByRole('separator', { name: 'Resize sidebar' });
    fireEvent.keyDown(edge, { key: 'ArrowRight' });
    expect(edge.getAttribute('aria-valuenow')).toBe('288');
    fireEvent.keyDown(edge, { key: 'ArrowRight', shiftKey: true });
    expect(edge.getAttribute('aria-valuenow')).toBe('336');
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search or enter URL' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Collapse workspace' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('shrinks then grows the sidebar at 918px without changing workspace width', () => {
    containerWidth = 918;
    render(<AppShellWorkspaceExperiment />);
    const edge = screen.getByRole('separator', { name: 'Resize sidebar' });
    const workspace = screen.getByRole('separator', { name: 'Resize workspace' });
    expect(workspace.getAttribute('aria-valuenow')).toBe('318');
    fireEvent.keyDown(edge, { key: 'ArrowLeft' });
    expect(edge.getAttribute('aria-valuenow')).toBe('256');
    expect(workspace.getAttribute('aria-valuenow')).toBe('318');
    fireEvent.keyDown(edge, { key: 'ArrowRight' });
    expect(edge.getAttribute('aria-valuenow')).toBe('272');
    expect(workspace.getAttribute('aria-valuenow')).toBe('318');
  });

  it('reports fitted width at 950px and restores the stored width when space returns', () => {
    containerWidth = 950;
    render(<AppShellWorkspaceExperiment />);
    const edge = screen.getByRole('separator', { name: 'Resize workspace' });
    const shell = screen.getByRole('region', { name: 'App shell workspace experiment' });
    expect(edge.getAttribute('aria-valuenow')).toBe('350');
    expect(shell.style.getPropertyValue('--workspace-width')).toBe('350px');
    resizeContainer(1400);
    expect(edge.getAttribute('aria-valuenow')).toBe('360');
    expect(shell.style.getPropertyValue('--workspace-width')).toBe('360px');
  });

  it.each(['sidebar', 'workspace'] as const)('resets %s on double click', (side) => {
    render(<AppShellWorkspaceExperiment />);
    const edge = screen.getByRole('separator', { name: `Resize ${side}` });
    fireEvent.keyDown(edge, { key: 'End' });
    fireEvent.doubleClick(edge);
    expect(edge.getAttribute('aria-valuenow')).toBe(side === 'sidebar' ? '272' : '360');
  });

  it.each(['sidebar', 'workspace'] as const)('cancels a captured %s drag when collapsed', (side) => {
    vi.stubGlobal('PointerEvent', class extends MouseEvent {
      pointerId = 7;
      isPrimary = true;
    });
    render(<AppShellWorkspaceExperiment />);
    const edge = screen.getByRole('separator', { name: `Resize ${side}` });
    const release = vi.fn();
    edge.setPointerCapture = vi.fn();
    edge.hasPointerCapture = vi.fn(() => true);
    edge.releasePointerCapture = release;
    fireEvent.pointerDown(edge, { button: 0, clientX: 100 });
    expect(edge.setPointerCapture).toHaveBeenCalledWith(7);
    fireEvent.pointerMove(edge, { clientX: 124 });
    const width = edge.getAttribute('aria-valuenow');
    fireEvent.click(screen.getByRole('button', { name: `Collapse ${side}` }));
    expect(release).toHaveBeenCalledWith(7);
    fireEvent.pointerMove(edge, { clientX: 180 });
    fireEvent.click(screen.getByRole('button', { name: `Expand ${side}` }));
    expect(edge.getAttribute('aria-valuenow')).toBe(width);
  });

  it('opens a dialog only on user request, wraps Tab both ways and restores focus', () => {
    containerWidth = 760;
    render(<AppShellWorkspaceExperiment />);
    expect(document.activeElement).toBe(document.body);
    const toggle = openWorkspace();
    const drawer = screen.getByRole('dialog', { name: 'Workspace' });
    const close = within(drawer).getByRole('button', { name: 'Close workspace' });
    expect(drawer.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(close);
    expect(screen.getByRole('region', { name: 'Conversation' }).hasAttribute('inert')).toBe(true);
    const last = within(drawer).getByRole('button', { name: /Q3 launch checklist/ });
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(document.activeElement).toBe(toggle);
    expect(screen.getByRole('region', { name: 'Conversation' }).hasAttribute('inert')).toBe(false);
  });

  it('restores focus when an open drawer becomes docked', () => {
    containerWidth = 760;
    render(<AppShellWorkspaceExperiment />);
    const toggle = openWorkspace();
    resizeContainer(1200);
    expect(document.activeElement).toBe(toggle);
    expect(screen.getByRole('complementary', { name: 'Workspace' }).hasAttribute('aria-modal')).toBe(false);
  });

  it('auto-folds the sidebar and returns focus to its toggle after narrowing', () => {
    containerWidth = 1200;
    render(<AppShellWorkspaceExperiment />);
    const newChat = screen.getByRole('button', { name: 'New chat' });
    newChat.focus();
    resizeContainer(760);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByRole('dialog', { name: 'Sidebar' }).hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Workspace' }).hasAttribute('inert')).toBe(true);
  });

  it('restores sidebar toggle focus when the compact overlay becomes docked', () => {
    containerWidth = 560;
    render(<AppShellWorkspaceExperiment />);
    const toggle = screen.getByRole('button', { name: 'Expand sidebar' });
    fireEvent.click(toggle);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close sidebar' }));
    resizeContainer(1200);
    expect(document.activeElement).toBe(toggle);
    expect(screen.getByRole('complementary', { name: 'Sidebar' }).hasAttribute('aria-modal')).toBe(false);
  });

  it('announces workspace actions outside inert content', () => {
    containerWidth = 760;
    render(<AppShellWorkspaceExperiment />);
    openWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /^Terminal/ }));
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Terminal selected');
    expect(status.closest('[inert]')).toBeNull();
  });

  it('uses the fractional shell width for a single layout mode', () => {
    containerWidth = 900.4;
    render(<AppShellWorkspaceExperiment />);
    const shell = screen.getByRole('region', { name: 'App shell workspace experiment' });
    expect(shell.dataset.mode).toBe('docked');
    resizeContainer(900);
    expect(shell.dataset.mode).toBe('drawer');
    resizeContainer(600);
    expect(shell.dataset.mode).toBe('compact');
  });

  it.each([760, 560])('makes the sidebar modal at %s px and restores focus on close', (width) => {
    containerWidth = width;
    render(<AppShellWorkspaceExperiment />);
    const toggle = screen.getByRole('button', { name: 'Expand sidebar' });
    toggle.focus();
    fireEvent.click(toggle);
    const sidebar = screen.getByRole('dialog', { name: 'Sidebar' });
    expect(sidebar.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole('region', { name: 'Conversation' }).hasAttribute('inert')).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(toggle);
    expect(screen.getByRole('region', { name: 'Conversation' }).hasAttribute('inert')).toBe(false);
  });
  it('keeps an open sidebar and its focus when crossing the spacing breakpoint', () => {
    containerWidth = 760;
    render(<AppShellWorkspaceExperiment />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    const close = screen.getByRole('button', { name: 'Close sidebar' });
    resizeContainer(560);
    expect(document.activeElement).toBe(close);
    expect(screen.getByRole('dialog', { name: 'Sidebar' }).hasAttribute('inert')).toBe(false);
    expect(screen.getByRole('region', { name: 'Conversation' }).hasAttribute('inert')).toBe(true);
    resizeContainer(760);
    expect(document.activeElement).toBe(close);
  });

  it('restores the workspace after a sidebar round trip through its constrained maximum', () => {
    containerWidth = 918;
    render(<AppShellWorkspaceExperiment />);
    const sidebar = screen.getByRole('separator', { name: 'Resize sidebar' });
    const workspace = screen.getByRole('separator', { name: 'Resize workspace' });
    const shell = screen.getByRole('region', { name: 'App shell workspace experiment' });
    fireEvent.keyDown(sidebar, { key: 'End' });
    expect(sidebar.getAttribute('aria-valuenow')).toBe('310');
    expect(workspace.getAttribute('aria-valuenow')).toBe('280');
    fireEvent.doubleClick(sidebar);
    expect(sidebar.getAttribute('aria-valuenow')).toBe('272');
    expect(workspace.getAttribute('aria-valuenow')).toBe('318');
    expect(shell.style.getPropertyValue('--workspace-width')).toBe('318px');
  });

  it('preserves the untouched workspace preference through a sidebar resize', () => {
    containerWidth = 918;
    render(<AppShellWorkspaceExperiment />);
    fireEvent.keyDown(screen.getByRole('separator', { name: 'Resize sidebar' }), { key: 'ArrowLeft' });
    resizeContainer(1400);
    expect(screen.getByRole('separator', { name: 'Resize workspace' }).getAttribute('aria-valuenow')).toBe('360');
    expect(screen.getByRole('region', { name: 'App shell workspace experiment' }).style.getPropertyValue('--workspace-width')).toBe('360px');
  });

  it('resets to the design default even when the workspace is constrained', () => {
    containerWidth = 950;
    render(<AppShellWorkspaceExperiment />);
    const edge = screen.getByRole('separator', { name: 'Resize workspace' });
    fireEvent.doubleClick(edge);
    resizeContainer(1400);
    expect(edge.getAttribute('aria-valuenow')).toBe('360');
    expect(screen.getByRole('region', { name: 'App shell workspace experiment' }).style.getPropertyValue('--workspace-width')).toBe('360px');
  });

  it.each([
    { from: 1200, to: 760, side: 'workspace', role: 'textbox', name: 'Search or enter URL' },
    { from: 1200, to: 760, side: 'sidebar', role: 'button', name: 'New chat' },
  ])('returns focus before auto-folding the $side', ({ from, to, side, role, name }) => {
    containerWidth = from;
    render(<AppShellWorkspaceExperiment />);
    screen.getByRole(role, { name }).focus();
    resizeContainer(to);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: `Expand ${side}` }));
    expect(document.activeElement?.closest('[inert]')).toBeNull();
  });

  it.each([
    { side: 'workspace', to: 760, toggleName: 'Expand workspace' },
    { side: 'sidebar', to: 760, toggleName: 'Expand sidebar' },
    { side: 'sidebar', to: 560, toggleName: 'Expand sidebar' },
  ])('restores focus when the $side separator unmounts at $to px', ({ side, to, toggleName }) => {
    containerWidth = 1200;
    render(<AppShellWorkspaceExperiment />);
    const separator = screen.getByRole('separator', { name: `Resize ${side}` });
    separator.focus();
    expect(document.activeElement).toBe(separator);
    resizeContainer(to);
    expect(document.activeElement?.getAttribute('aria-label')).toBe(toggleName);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: toggleName }));
  });

  it('returns focus to the invoking toggle without pre-focusing it', () => {
    containerWidth = 760;
    render(<AppShellWorkspaceExperiment />);
    const toggle = screen.getByRole('button', { name: 'Expand workspace' });
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(toggle);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close workspace' }), { key: 'Escape' });
    expect(document.activeElement).toBe(toggle);
  });

  it.each(['sidebar', 'workspace'] as const)('reopens auto-folded %s but preserves user folds', (side) => {
    render(<AppShellWorkspaceExperiment />);
    resizeContainer(760);
    expect(screen.getByRole('button', { name: `Expand ${side}` }).getAttribute('aria-expanded')).toBe('false');
    resizeContainer(1400);
    const toggle = screen.getByRole('button', { name: `Collapse ${side}` });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    resizeContainer(560);
    resizeContainer(1400);
    expect(screen.getByRole('button', { name: `Expand ${side}` }).getAttribute('aria-expanded')).toBe('false');
  });

  it('makes the toolbar inert until the drawer closes', () => {
    containerWidth = 760;
    render(<AppShellWorkspaceExperiment />);
    const toggle = openWorkspace();
    const toolbar = toggle.closest('header')!;
    expect(toolbar.hasAttribute('inert')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close workspace' }));
    expect(toolbar.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('dismisses the changelog cards in order without removing their nodes', () => {
    render(<AppShellWorkspaceExperiment />);
    const shared = screen.getByText('Shared folders').closest('article')!;
    const scheduled = screen.getByText('Scheduled chats').closest('article')!;
    expect(shared.getAttribute('aria-hidden')).toBe('false');
    expect(scheduled.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(shared.isConnected).toBe(true);
    expect(shared.getAttribute('aria-hidden')).toBe('true');
    expect(scheduled.getAttribute('aria-hidden')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(scheduled.isConnected).toBe(true);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('shows setup progress and preserves completed tasks across collapse', () => {
    render(<AppShellWorkspaceExperiment />);
    const summary = screen.getByRole('button', { name: /Getting started/ });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('13');
    fireEvent.click(summary);
    expect(summary.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Invite your teammates' }));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');
    fireEvent.click(summary);
    expect(screen.queryByRole('checkbox', { name: 'Invite your teammates' })).toBeNull();
    fireEvent.click(summary);
    expect((screen.getByRole('checkbox', { name: 'Invite your teammates' }) as HTMLInputElement).checked).toBe(true);
  });

});
