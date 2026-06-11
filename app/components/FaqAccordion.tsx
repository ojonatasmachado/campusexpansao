"use client";
import { useState } from "react";

interface FaqItem { q: string; a: string }

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="faq">
      {items.map((item, i) => (
        <div className={`faq-item${open === i ? " open" : ""}`} key={i}>
          <button className="faq-q" type="button" onClick={() => setOpen(open === i ? null : i)}>
            <span className="faq-q-text">{item.q}</span>
            <span className="faq-icon" aria-hidden="true" />
          </button>
          <div className="faq-a">{item.a}</div>
        </div>
      ))}
    </div>
  );
}
