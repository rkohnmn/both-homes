/** Browser file helpers used by exports and imports. */

export function downloadFile(filename, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function readTextFile(file) {
  if (!file) return Promise.reject(new Error('No file selected.'));
  if (file.size > 2_000_000) return Promise.reject(new Error('That file is too large to be a plan.'));
  return file.text();
}

export function planFilename(today) {
  const date = today || new Date().toISOString().slice(0, 10);
  return `both-homes-plan-${date}.json`;
}
