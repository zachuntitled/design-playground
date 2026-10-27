"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { VisuallyHidden } from "@open-design/components";
import styles from "./composer.module.css";
import {
  PlusIcon, HandIcon, ShieldIcon, MicIcon, ChevronIcon, ArrowUpIcon, FolderIcon,
  GmailLogo, SlackLogo, ClickUpLogo, SparklesIcon, TickIcon, CancelIcon, ClaudeLogo, ChatGPTLogo,
} from "./composer-icons";

type Step = "idle" | "loading" | "done";

type ChatModel = {
  id: string;
  name: string;
  description: string;
  Logo: ComponentType;
};

type ComposerRequest = "attach" | "select-project" | "connect-apps" | "request-approval";

type ChatComposerProps = {
  onSend: (message: string, details: { model: string }) => void;
  onRequest: (request: ComposerRequest) => void;
};

const models: [ChatModel, ...ChatModel[]] = [
  { id: "auto", name: "Auto", description: "Picks the best model for each task", Logo: SparklesIcon },
  { id: "claude", name: "Claude", description: "Thoughtful writing and code", Logo: ClaudeLogo },
  { id: "chatgpt", name: "ChatGPT", description: "Quick answers for everyday tasks", Logo: ChatGPTLogo },
];

const TRACE = 16;
const silentTrace = () => Array.from({ length: TRACE }, () => 0);

const dictation = "Draft a short update for the team about this week's progress";
const loadMs = 1300;

export function ChatComposer({ onSend, onRequest }: ChatComposerProps) {
  const [apps, setApps] = useState<Step>("idle");
  const [approval, setApproval] = useState<Step>("idle");
  const [message, setMessage] = useState("");

  const [model, setModel] = useState<ChatModel>(models[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState("");
  const [trace, setTrace] = useState(silentTrace);
  const [status, setStatus] = useState("");

  const body = useRef<HTMLElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const discardButton = useRef<HTMLButtonElement>(null);
  const projectButton = useRef<HTMLButtonElement>(null);
  const connectButton = useRef<HTMLButtonElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const voiceActions = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState(1);
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    const prev = el.style.height;
    el.style.height = "0px";
    const content = el.scrollHeight;
    el.style.height = prev;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 1;
    setLines(Math.min(2, Math.max(1, Math.round(content / lineHeight))));
  }, [message]);
  const modelButton = useRef<HTMLButtonElement>(null);

  const modelWidth = useRef(0);
  const [modelMorph, setModelMorph] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) fn();
    else timers.current.push(window.setTimeout(fn, loadMs));
  };

  useLayoutEffect(() => {
    const focusProject = apps === "done" && document.activeElement === connectButton.current;
    projectButton.current?.toggleAttribute("inert", apps !== "done");
    connectButton.current?.toggleAttribute("inert", apps === "done");
    if (!body.current?.closest("[inert]")) {
      if (focusProject) projectButton.current?.focus();
    }
  }, [apps]);

  useLayoutEffect(() => {
    actions.current?.toggleAttribute("inert", recording);
    voiceActions.current?.toggleAttribute("inert", !recording);
    if (recording && !body.current?.closest("[inert]")) discardButton.current?.focus();
  }, [recording]);

  const closeMenu = useCallback((refocus: boolean) => {
    setMenuOpen(false);
    if (refocus && !body.current?.closest("[inert]")) modelButton.current?.focus();
  }, []);

  const connect = () => {
    if (apps !== "idle") return;
    setApps("loading");
    setStatus("Demo: connecting apps…");
    onRequest("connect-apps");
    later(() => {
      setApps("done");
      setStatus("Demo apps connected. Select a project.");
    });
  };

  const requestApproval = () => {
    if (approval !== "idle") return;
    setApproval("loading");
    setStatus("Demo: requesting approval…");
    onRequest("request-approval");
    later(() => {
      setApproval("done");
      setStatus("Demo approval granted. No permissions changed.");
    });
  };

  const pickModel = (next: ChatModel) => {
    if (next.id !== model.id) setModelMorph(true);
    setModel(next);
    setStatus(`${next.name} selected.`);
    closeMenu(true);
  };

  useLayoutEffect(() => {
    const el = modelButton.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    const from = modelWidth.current;
    modelWidth.current = width;
    if (!modelMorph || !from || Math.abs(from - width) < 0.5) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = el.animate([{ width: `${from}px` }, { width: `${width}px` }], {
      duration: 460,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    });
    return () => animation.cancel();
  }, [model.id, modelMorph]);

  useEffect(() => {
    if (!recording) return;
    const words = dictation.split(/\s+/).filter(Boolean);
    let count = 0;
    const speak = window.setInterval(() => {
      count = Math.min(words.length, count + 1);
      setHeard(words.slice(0, count).join(" "));
    }, 320);
    const listen = window.setInterval(() => {
      const talking = count < words.length;
      const level = talking && Math.random() > 0.3 ? 0.3 + Math.random() * 0.7 : 0;
      setTrace((t) => [...t.slice(1), level]);
    }, 120);
    return () => {
      clearInterval(speak);
      clearInterval(listen);
    };
  }, [recording]);

  const startRecording = () => {
    setMenuOpen(false);
    setHeard("");
    setTrace(silentTrace());
    setRecording(true);
    setStatus("Voice demo running. No microphone is used. Press Escape to discard.");
  };

  const stopRecording = (keep: boolean) => {
    setRecording(false);
    if (keep && heard) {
      setMessage((current) => (current.trim() ? `${current.trimEnd()} ${heard}` : heard));
      setStatus("Demo transcript added to your message.");
    } else {
      setStatus("Voice demo discarded.");
    }
    setHeard("");
    if (!body.current?.closest("[inert]")) textarea.current?.focus();
  };

  const canSend = message.trim().length > 0;
  const send = () => {
    if (!canSend || recording) return;
    onSend(message.trim(), { model: model.id });
    setMessage("");
    setStatus("Message sent.");
    if (!body.current?.closest("[inert]")) textarea.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      if (!event.repeat) send();
    }
  };

  const onBodyKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && recording) {
      event.preventDefault();
      event.stopPropagation();
      stopRecording(false);
    }
  };

  const focusMessage = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, textarea, input")) return;
    event.preventDefault();
    if (!body.current?.closest("[inert]")) textarea.current?.focus();
  };

  return (
    <div className={styles.composer}>
      <section
        ref={body}
        className={styles.body}
        data-apps={apps}
        data-approval={approval}
        data-recording={recording}
        style={{ "--ui-cc-grow": (lines - 1) * 106.424 } as CSSProperties}
        aria-label="Message composer"
        onKeyDown={onBodyKeyDown}
      >
        <div className={styles.tray}>
          <button
            type="button"
            className={[styles.row, styles.project].join(" ")}
            ref={projectButton}
            onClick={() => onRequest("select-project")}
            tabIndex={apps === "done" ? 0 : -1}
            aria-hidden={apps !== "done"}
          >
            <span className={[styles.icon, styles["icon--folder"]].join(" ")}>
              <FolderIcon />
            </span>
            <span className={styles.label}>Select a project</span>
          </button>
          <button
            type="button"
            className={[styles.row, styles.connect].join(" ")}
            ref={connectButton}
            onClick={connect}
            aria-hidden={apps === "done"}
            tabIndex={apps === "done" ? -1 : 0}
            aria-disabled={apps !== "idle"}

            aria-busy={apps === "loading"}
          >
            <span className={styles.logos} aria-hidden="true">
              <span className={[styles.logo, styles["logo--gmail"]].join(" ")}>
                <GmailLogo />
              </span>
              <span className={[styles.logo, styles["logo--slack"]].join(" ")}>
                <SlackLogo />
              </span>
              <span className={[styles.logo, styles["logo--clickup"]].join(" ")}>
                <ClickUpLogo />
              </span>
            </span>
            <span className={[styles.label, styles.shimmer].join(" ")} data-text="Connect apps">
              Connect apps
            </span>
          </button>
        </div>
        <div className={styles.card} onPointerDown={focusMessage}>
          <textarea
            ref={textarea}
            className={styles.message}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Start by typing..."
            aria-label="Message"
            spellCheck={false}
            readOnly={recording}
            dir="auto"
          />
          <div className={styles.draft} aria-hidden="true" dir="auto">
            {message}
            {message && heard && !/\s$/.test(message) ? " " : ""}
            <span className={styles.heard}>{heard}</span>
          </div>
          <div className={styles.toolbar}>
            <button type="button" className={styles["icon-btn"]} aria-label="Add attachment" onClick={() => onRequest("attach")}>
              <span className={styles.icon}>
                <PlusIcon />
              </span>
            </button>
            <button
              type="button"
              className={styles.approval}
              onClick={requestApproval}
              aria-busy={approval === "loading"}
              aria-disabled={approval !== "idle"}
            >
              <span className={styles.wash} aria-hidden="true" />
              <span className={styles.icon} aria-hidden="true">
                <HandIcon />
                <ShieldIcon />
              </span>
              <span className={styles["approval-text"]}>
                <span
                  className={[styles.request, styles.shimmer].join(" ")}
                  data-text="Request approval"
                  aria-hidden={approval === "done"}
                >
                  Request approval
                </span>
                <span className={styles.granted} aria-hidden={approval !== "done"}>
                  Unrestricted access
                </span>
              </span>
            </button>
          </div>
          <div ref={actions} className={[styles.toolbar, styles["toolbar--end"]].join(" ")} aria-hidden={recording}>
            <button
              ref={modelButton}
              type="button"
              className={styles.model}
              tabIndex={recording ? -1 : 0}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setMenuOpen(true);
                }
              }}
            >
              <span className={styles["model-face"]} key={model.id} data-morph={modelMorph || undefined}>
                {model.id !== "auto" && (
                  <span className={styles["model-logo"]} aria-hidden="true">
                    <model.Logo />
                  </span>
                )}
                <span className={[styles.label, styles["model-name"]].join(" ")} title={model.name} dir="auto">
                  {model.name}
                </span>
              </span>
              <span className={[styles.icon, styles["icon--chevron"]].join(" ")} aria-hidden="true">
                <ChevronIcon />
              </span>
            </button>
            <button
              type="button"
              className={styles["icon-btn"]}
              aria-label="Start voice demo"
              tabIndex={recording ? -1 : 0}
              onClick={startRecording}
            >
              <span className={styles.icon}>
                <MicIcon />
              </span>
            </button>
            <button
              type="button"
              className={styles.send}
              aria-label="Send message"
              disabled={!canSend || recording}
              tabIndex={recording ? -1 : 0}
              onClick={send}
            >
              <ArrowUpIcon />
            </button>
          </div>
          <div
            ref={voiceActions}
            className={[styles.toolbar, styles["toolbar--end"], styles["toolbar--voice"]].join(" ")}
            aria-hidden={!recording}
          >
            <span className={styles.trace} aria-hidden="true">
              {trace.map((level, i) => (
                <span key={i} style={{ height: `calc(${Math.max(8, level * 64)} * var(--u))` }} />
              ))}
            </span>
            <button
              type="button"
              className={styles.square}
              ref={discardButton}
              aria-label="Discard voice demo"
              tabIndex={recording ? 0 : -1}
              onClick={() => stopRecording(false)}
            >
              <CancelIcon />
            </button>
            <button
              type="button"
              className={styles.square}
              aria-label="Use demo transcript"
              tabIndex={recording ? 0 : -1}
              onClick={() => stopRecording(true)}
            >
              <TickIcon />
            </button>
          </div>
        </div>
        <ModelMenu
          open={menuOpen}
          models={models}
          selected={model}
          anchor={modelButton}
          container={body}
          onPick={pickModel}
          onClose={closeMenu}
        />
      </section>
      <p className={styles.caption}>Local design preview{recording ? " · Voice demo · No microphone" : ""}</p>
      <VisuallyHidden aria-live="polite">
        {status}
      </VisuallyHidden>
    </div>
  );
}

function clippingFrame(from: HTMLElement) {
  const frame = { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
  for (let el = from.parentElement; el; el = el.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (/hidden|clip|auto|scroll/.test(overflowX)) {
      frame.left = Math.max(frame.left, rect.left + el.clientLeft);
      frame.right = Math.min(frame.right, rect.left + el.clientLeft + el.clientWidth);
    }
    if (/hidden|clip|auto|scroll/.test(overflowY)) {
      frame.top = Math.max(frame.top, rect.top + el.clientTop);
      frame.bottom = Math.min(frame.bottom, rect.top + el.clientTop + el.clientHeight);
    }
  }
  return frame;
}

function ModelMenu({
  open,
  models,
  selected,
  anchor,
  container,
  onPick,
  onClose,
}: {
  open: boolean;
  models: ChatModel[];
  selected: ChatModel;
  anchor: RefObject<HTMLButtonElement | null>;
  container: RefObject<HTMLElement | null>;
  onPick: (model: ChatModel) => void;
  onClose: (refocus: boolean) => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState({ top: 0, left: 0, up: true, fromTop: 0, fromLeft: 0, fromRadius: 0 });
  const [fill, setFill] = useState({ y: 0, h: 0, glide: false });

  const [shown, setShown] = useState(false);
  const wasShown = useRef(false);

  const [visible, setVisible] = useState(false);
  const [placing, setPlacing] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const buttonElement = anchor.current;
    const bodyElement = container.current;
    const list = panel.current;
    if (!buttonElement || !bodyElement || !list) return;
    const wrapper = list.parentElement!;
    const placeMenu = () => {
      if (bodyElement.closest("[inert]")) {
        onClose(false);
        return;
      }
      const button = buttonElement.getBoundingClientRect();
      const box = bodyElement.getBoundingClientRect();
      const frame = clippingFrame(bodyElement);
      const inset = 8;
      const gap = 8;
      wrapper.style.maxWidth = `${Math.max(0, frame.right - frame.left - 2 * inset)}px`;
      list.style.maxHeight = `${Math.max(0, frame.bottom - frame.top - 2 * inset)}px`;
      const width = list.offsetWidth;
      const height = list.offsetHeight;
      const roomAbove = button.top - gap - (frame.top + inset);
      const roomBelow = frame.bottom - inset - (button.bottom + gap);
      const up = roomAbove >= height || roomAbove >= roomBelow;
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
      const top = clamp(up ? button.top - gap - height : button.bottom + gap,
        frame.top + inset, frame.bottom - inset - height);
      const left = clamp(button.right - width, frame.left + inset, frame.right - inset - width);
      setPlace({
        top: top - box.top,
        left: left - box.left,
        up,
        fromTop: up ? clamp(height - button.height, 0, height - 1) : 0,
        fromLeft: clamp(button.left - left, 0, width - 1),
        fromRadius: button.height / 2,
      });
    };
    setActive(Math.max(0, models.findIndex((m) => m.id === selected.id)));
    setShown(false);
    setPlacing(true);
    placeMenu();
    const observer = new ResizeObserver(placeMenu);
    const inertObserver = new MutationObserver(() => {
      if (bodyElement.closest("[inert]")) onClose(false);
    });
    for (let element: HTMLElement | null = bodyElement; element; element = element.parentElement) {
      observer.observe(element);
      inertObserver.observe(element, { attributes: true, attributeFilter: ["inert"] });
    }
    observer.observe(buttonElement);
    observer.observe(list);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    // The anchor moves during the connect tray transition without changing size.
    bodyElement.addEventListener("transitionend", placeMenu);
    return () => {
      observer.disconnect();
      inertObserver.disconnect();
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
      bodyElement.removeEventListener("transitionend", placeMenu);
    };
  }, [open, anchor, container, models, selected.id, onClose]);

  useLayoutEffect(() => {
    if (!open || !placing || visible || !panel.current || container.current?.closest("[inert]")) return;
    void getComputedStyle(panel.current).clipPath;
    setPlacing(false);
    setVisible(true);
  }, [open, place, placing, visible, container]);

  useLayoutEffect(() => {
    menu.current?.toggleAttribute("inert", !open || !visible);
  }, [open, visible]);

  useEffect(() => {
    if (open && visible && !container.current?.closest("[inert]")) panel.current?.focus({ preventScroll: true });
  }, [open, visible, container]);

  useLayoutEffect(() => {
    const row = rows.current[active];
    if (row) setFill({ y: row.offsetTop, h: row.offsetHeight, glide: wasShown.current && shown });

    const list = panel.current;
    if (row && list && open) {
      if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 4;
      else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight + 4;
    }
    wasShown.current = shown;
  }, [active, open, shown]);

  useEffect(() => {
    if (!open) return;
    const away = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onClose, anchor]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = models.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
      setShown(true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = models[active];
      if (option) onPick(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    } else if (event.key === "Tab") {
      onClose(true);
    }
  };

  return (
    <div
      ref={menu}
      className={styles.menu}
      data-open={visible}
      data-placing={placing}
      data-up={place.up}
      style={
        {
          top: place.top,
          left: place.left,
          "--from-top": `${place.fromTop}px`,
          "--from-left": `${place.fromLeft}px`,
          "--from-bottom": place.up ? "0px" : `calc(100% - ${place.fromRadius * 2}px)`,
          "--from-radius": `${place.fromRadius}px`,
        } as CSSProperties
      }
      aria-hidden={!open || !visible}
    >
      <div
        ref={panel}
        className={styles["menu-panel"]}
        role="listbox"
        tabIndex={-1}
        aria-label="Select a model"
        aria-activedescendant={`${id}-${active}`}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setShown(false)}
      >
        <span
          className={styles["menu-fill"]}
          aria-hidden="true"
          data-glide={fill.glide}
          style={{ transform: `translateY(${fill.y}px)`, height: fill.h, opacity: shown ? 1 : 0 }}
        />
        {models.map((m, i) => (
          <div
            key={m.id}
            ref={(el) => {
              rows.current[i] = el;
            }}
            id={`${id}-${i}`}
            role="option"
            aria-labelledby={`${id}-${i}-name`}
            aria-describedby={`${id}-${i}-description`}
            aria-selected={m.id === selected.id}
            className={styles.option}
            onPointerEnter={() => {
              setActive(i);
              setShown(true);
            }}
            onClick={() => onPick(m)}
          >
            <span className={styles["option-logo"]} aria-hidden="true">
              <m.Logo />
            </span>
            <span className={styles["option-text"]}>
              <span id={`${id}-${i}-name`} className={styles["option-name"]} dir="auto">
                {m.name}
              </span>
              {m.description && (
                <span id={`${id}-${i}-description`} className={styles["option-desc"]} title={m.description} dir="auto">
                  {m.description}
                </span>
              )}
            </span>
            <span className={styles["option-check"]} aria-hidden="true">
              <TickIcon />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
