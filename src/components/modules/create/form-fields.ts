/** Écrit une valeur dans un champ non contrôlé du formulaire de création (et le fait savoir). */
export function setField(id: string, value: string, onlyIfEmpty = false): boolean {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (!el) return false;
  if (onlyIfEmpty && el.value.trim() && el.value !== "0") return false;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
