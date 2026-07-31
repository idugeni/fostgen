/** Trigger a client-side file download for in-memory text. */
export function downloadTextFile(
  content: string,
  fileName: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();

  // Revoking synchronously can cancel the download in some browsers.
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

const MIME_TYPES: Record<string, string> = {
  md: 'text/markdown;charset=utf-8',
  json: 'application/json;charset=utf-8',
  yaml: 'text/yaml;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
};

export function mimeTypeForFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_TYPES[extension] ?? 'text/plain;charset=utf-8';
}
