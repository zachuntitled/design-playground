// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatComposer } from '../src/lab/app-shell-workspace/composer';

let reducedMotion = false;

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion = false;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount() {
  const onSend = vi.fn();
  const onRequest = vi.fn();
  const view = render(<ChatComposer onSend={onSend} onRequest={onRequest} />);
  return { ...view, onSend, onRequest };
}

describe('Classic lab composer', () => {
  it('rejects whitespace and composition, preserves Shift+Enter, and sends a trimmed draft once', () => {
    const { onSend } = mount();
    const message = screen.getByRole('textbox', { name: 'Message' });
    const send = screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(message, { target: { value: '  \n ' } });
    fireEvent.keyDown(message, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.change(message, { target: { value: '  A quieter layout\nwith space  ' } });
    expect(send.disabled).toBe(false);
    for (const event of [{ shiftKey: true }, { isComposing: true }, { keyCode: 229 }, { repeat: true }]) {
      fireEvent.keyDown(message, { key: 'Enter', ...event });
    }
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(message, { key: 'Enter' });
    fireEvent.keyDown(message, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledExactlyOnceWith('A quieter layout\nwith space', { model: 'auto' });
    expect((message as HTMLTextAreaElement).value).toBe('');
    expect(document.activeElement).toBe(message);
    expect(send.disabled).toBe(true);
  });

  it('selects models by keyboard and includes the selected model in a button send', () => {
    const { onSend } = mount();
    const trigger = screen.getByRole('button', { name: 'Auto' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = screen.getByRole('listbox', { name: 'Select a model' });
    expect(document.activeElement).toBe(menu);
    for (const key of ['End', 'Home', 'ArrowDown', ' ']) fireEvent.keyDown(menu, { key });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Claude' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Use warm neutrals' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(onSend).toHaveBeenCalledExactlyOnceWith('Use warm neutrals', { model: 'claude' });
    fireEvent.click(screen.getByRole('button', { name: 'Claude' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'ChatGPT' })).toBeTruthy();
  });

  it('closes the model menu on Escape, Tab, and outside pointer input', () => {
    mount();
    const trigger = screen.getByRole('button', { name: 'Auto' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Tab' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('textbox'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('flushes the positioned closed menu before revealing it on each open', () => {
    mount();
    const trigger = screen.getByRole('button', { name: 'Auto' });
    let left = 300;
    vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(() => new DOMRect(left, 400, 60, 24));
    const getStyle = window.getComputedStyle.bind(window);
    const flushed: { open: string | undefined; placing: string | undefined; left: string }[] = [];
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (element.getAttribute('role') === 'listbox') {
        const menu = element.parentElement!;
        flushed.push({ open: menu.dataset.open, placing: menu.dataset.placing, left: menu.style.left });
      }
      return getStyle(element);
    });
    fireEvent.click(trigger);
    expect(flushed).toEqual([{ open: 'false', placing: 'true', left: '360px' }]);
    expect(document.activeElement).toBe(screen.getByRole('listbox'));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    left = 420;
    fireEvent.click(trigger);
    expect(flushed.at(-1)).toEqual({ open: 'false', placing: 'true', left: '480px' });
    expect(document.activeElement).toBe(screen.getByRole('listbox'));
  });

  it('closes an open model menu without taking focus from an inert parent', async () => {
    const { container } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
    const drawerButton = document.createElement('button');
    document.body.append(drawerButton);
    await act(async () => {
      container.setAttribute('inert', '');
      drawerButton.focus();
    });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(drawerButton);
    drawerButton.remove();
  });

  it('runs connect and approval demos and exposes the project and attachment requests', () => {
    const { onRequest } = mount();
    const connect = screen.getByRole('button', { name: 'Connect apps' });
    connect.focus();
    fireEvent.click(connect);
    fireEvent.click(connect);
    fireEvent.click(screen.getByRole('button', { name: 'Request approval' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add attachment' }));
    expect(onRequest.mock.calls.map(([request]) => request)).toEqual(['connect-apps', 'request-approval', 'attach']);
    act(() => vi.advanceTimersByTime(1299));
    expect(screen.queryByRole('button', { name: 'Select a project' })).toBeNull();
    expect(connect.getAttribute('aria-busy')).toBe('true');
    act(() => vi.advanceTimersByTime(1));
    const project = screen.getByRole('button', { name: 'Select a project' });
    expect(document.activeElement).toBe(project);
    expect(connect.hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('button', { name: 'Unrestricted access' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(project);
    expect(onRequest).toHaveBeenLastCalledWith('select-project');
    expect(screen.getByText('Demo approval granted. No permissions changed.')).toBeTruthy();
  });

  it('finishes connect and approval immediately for reduced motion', () => {
    reducedMotion = true;
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Connect apps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request approval' }));
    expect(screen.getByRole('button', { name: 'Select a project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unrestricted access' })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps or discards canned voice text without sending, and clears its timers', () => {
    const { onSend, unmount } = mount();
    const message = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(message, { target: { value: 'Please' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start voice demo' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Discard voice demo' }));
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
    expect(screen.getByText(/Local design preview · Voice demo · No microphone/)).toBeTruthy();
    act(() => vi.advanceTimersByTime(640));
    fireEvent.click(screen.getByRole('button', { name: 'Use demo transcript' }));
    expect(message.value).toBe('Please Draft a');
    expect(document.activeElement).toBe(message);
    // jsdom schedules selectionchange when focus moves.
    act(() => vi.advanceTimersByTime(0));
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Start voice demo' }));
    act(() => vi.advanceTimersByTime(960));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Discard voice demo' }), { key: 'Escape' });
    expect(message.value).toBe('Please Draft a');
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start voice demo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Connect apps' }));
    unmount();
    act(() => vi.advanceTimersByTime(0));
    expect(vi.getTimerCount()).toBe(0);
  });
});
