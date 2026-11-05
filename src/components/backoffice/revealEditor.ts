export function revealEditor(element: HTMLElement | null) {
  if (!element) return;
  requestAnimationFrame(() => {
    if (element.isConnected) element.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
}
