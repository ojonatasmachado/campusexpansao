import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { printAST } from "@formatjs/icu-messageformat-parser/printer.js";
import type { Messages } from "./mensagens";

const ACCENTS: Record<string, string> = { a: "á", e: "ë", i: "ï", o: "ô", u: "ü", A: "Á", E: "Ë", I: "Ï", O: "Ô", U: "Ü" };

/** Expande só texto literal. Variáveis, tags, seleção e plural ficam intactos. */
export function pseudoMessage(message: string): string {
  const ast = parse(message);
  const visit = (elements: MessageFormatElement[]) => {
    for (const element of elements) {
      if (element.type === TYPE.literal && /\p{L}/u.test(element.value)) {
        const value = element.value.replace(/[aeiouAEIOU]/g, (letter) => ACCENTS[letter]);
        element.value = value + "·".repeat(Math.ceil(value.length * 0.4));
      } else if (element.type === TYPE.tag) visit(element.children);
      else if (element.type === TYPE.select || element.type === TYPE.plural) {
        for (const option of Object.values(element.options)) visit(option.value);
      }
    }
  };
  visit(ast);
  return printAST(ast);
}

export function pseudoMessages(messages: Messages): Messages {
  return Object.fromEntries(Object.entries(messages).map(([key, message]) => [key, pseudoMessage(message)]));
}
