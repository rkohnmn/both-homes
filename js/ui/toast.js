/** Non-blocking status messages with an optional action (usually Undo). */

import { el } from './dom.js';

let region = null;
let sequence = 0;

export function initToasts(node) {
  region = node;
}

export function toast(message, { actionLabel = '', onAction = null, duration = 4800 } = {}) {
  if (!region) return null;
  const id = `toast-${++sequence}`;
  const action = actionLabel
    ? el('button', { class: 'toast-action', type: 'button', text: actionLabel })
    : null;
  const node = el('div', { class: 'toast', id, role: 'status' }, el('span', { text: message }), action);
  let timer = null;

  const remove = () => {
    if (!node.isConnected) return;
    node.classList.add('toast-leave');
    setTimeout(() => node.remove(), 200);
  };

  const schedule = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(remove, ms);
  };

  action?.addEventListener('click', () => {
    onAction?.();
    remove();
  });

  node.addEventListener('mouseenter', () => clearTimeout(timer));
  node.addEventListener('mouseleave', () => schedule(2200));
  node.addEventListener('focusin', () => clearTimeout(timer));
  node.addEventListener('focusout', () => schedule(2200));

  region.append(node);
  while (region.children.length > 3) region.firstElementChild.remove();
  schedule(duration);
  return { node, remove };
}

export function dismissToasts() {
  if (!region) return;
  region.replaceChildren();
}
