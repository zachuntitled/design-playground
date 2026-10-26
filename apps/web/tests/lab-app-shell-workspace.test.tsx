// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppShellWorkspaceExperiment from '../src/lab/app-shell-workspace';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1400);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('lab app shell interactions', () => {
  it('makes folded panes inert and preserves workspace toggle focus', () => {
    render(<AppShellWorkspaceExperiment />);
    const workspace = screen.getByRole('complementary', { name: 'Workspace' });
    const toggle = screen.getByRole('button', { name: 'Collapse workspace', exact: true });
    toggle.focus();
    fireEvent.click(toggle);
    expect(workspace.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(toggle);
    expect(workspace.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(toggle);
    const sidebar = screen.getByRole('complementary', { name: 'Sidebar' });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar', exact: true }));
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
    expect(screen.getByRole('button', { name: 'Collapse workspace', exact: true }).getAttribute('aria-expanded')).toBe('true');
  });

  it('focuses the narrow drawer and returns focus when Escape closes it', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(700);
    render(<AppShellWorkspaceExperiment />);
    const close = screen.getByRole('button', { name: 'Close workspace', exact: true });
    expect(document.activeElement).toBe(close);
    expect(screen.getByRole('region', { name: 'Conversation' }).hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('complementary', { name: 'Sidebar' }).hasAttribute('inert')).toBe(true);
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Expand workspace', exact: true }));
    expect(screen.getByRole('region', { name: 'Conversation' }).hasAttribute('inert')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Expand workspace', exact: true }));
    expect(document.activeElement).toBe(close);
  });
});
