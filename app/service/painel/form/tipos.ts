export type ShowIf = { field: string; equals: string };

export type FieldDef =
  | { k: string; label: string; type: "text"; req?: boolean; half?: boolean; ph?: string; hint?: string; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "area"; req?: boolean; half?: boolean; ph?: string; hint?: string; big?: boolean; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "select"; req?: boolean; half?: boolean; ph?: string; hint?: string; options: { v: string; l: string }[]; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "date"; fullDate?: boolean; req?: boolean; half?: boolean; hint?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "time"; req?: boolean; half?: boolean; hint?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "toggle"; req?: boolean; half?: boolean; hint?: string; onLabel?: string; offLabel?: string; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "checks"; req?: boolean; half?: boolean; hint?: string; options: { v: string; l: string }[]; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "icon"; req?: boolean; half?: boolean; hint?: string; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "cep"; req?: boolean; half?: boolean; ph?: string; hint?: string; showIf?: ShowIf; secao?: string; autofill?: { street?: string; neighborhood?: string; city?: string; state?: string } };
