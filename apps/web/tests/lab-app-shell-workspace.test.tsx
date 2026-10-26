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
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => containerWidth);
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

  it('makes the compact sidebar modal on user open and restores focus on close', () => {
    containerWidth = 560;
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
});
