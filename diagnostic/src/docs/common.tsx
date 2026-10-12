import type { ReactNode } from "react";
import type { Evidence } from "../lib/ai/schemas";
import type { CaseBundle, PaperBundle } from "../lib/case-model";
import { conceptCitation, resolveConcept } from "../lib/concepts";
import { logoDataUri } from "./assets";

export type Ctx = { b: CaseBundle };

export const he = (b: CaseBundle) => ({ he: "he", she: "she", they: "they" })[b.student.pronoun];
export const him = (b: CaseBundle) => ({ he: "him", she: "her", they: "them" })[b.student.pronoun];
export const his = (b: CaseBundle) => ({ he: "his", she: "her", they: "their" })[b.student.pronoun];

export function classLabel(b: CaseBundle): string {
  const roman: Record<number, string> = { 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X" };
  return `Class ${roman[b.student.cls] ?? b.student.cls}${b.student.section ? `-${b.student.section}` : ""}`;
}

export function studentLine(b: CaseBundle): string {
  return `${b.student.name} · ${classLabel(b)}`;
}

export function cite(b: CaseBundle, conceptId: string, fallback = ""): string {
  return conceptCitation(resolveConcept(conceptId, { currentClass: b.student.cls, currentYear: b.student.year }, fallback));
}

export function conceptName(b: CaseBundle, conceptId: string, fallback = ""): string {
  return resolveConcept(conceptId, { currentClass: b.student.cls, currentYear: b.student.year }, fallback).name;
}

export function paperName(b: CaseBundle, key: string): string {
  return b.papers.find((p) => p.key === key)?.shortName ?? key;
}

export function paperByKey(b: CaseBundle, key: string): PaperBundle | undefined {
  return b.papers.find((p) => p.key === key);
}

/** Renders **bold** markers; everything else is plain text (escaped by React). */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p))}</>;
}

export function Bars({ light = false, width }: { light?: boolean; width?: string }) {
  return <div className={`bars${light ? " light" : ""}`} style={width ? { width } : undefined}><i /><i /><i /><i /></div>;
}

export function EvidenceText({ b, e }: { b: CaseBundle; e: Evidence }) {
  return (
    <>
      <strong>{e.q}</strong>: {e.observation}
      {e.marks ? ` ${e.marks}.` : ""}
    </>
  );
}

/** "P2 A9 (0/1)" style compact reference used in tables. */
export function evRef(e: Evidence): string {
  return `${e.q}${e.marks ? ` (${e.marks})` : ""}`;
}

export function Cover(props: {
  b: CaseBundle;
  kicker: string;
  lead: ReactNode;
  titleBold: string;
  titleLight: string;
  subBold: string;
  sub: string;
  whoLabel: string;
  whoLines: string[];
  badge?: string;
}) {
  const { b } = props;
  return (
    <section className="sheet cover">
      <div className="top">
        <img src={logoDataUri("dark")} alt="SEVEN Career Institute" />
        <div className="kicker">{props.kicker}</div>
      </div>
      <div className="lead">{props.lead}</div>
      <div className="band" />
      <div className="year">{String(b.student.year)}</div>
      <div className="title-strip" />
      <div className="title">
        <h1>{props.titleBold}<span>{props.titleLight}</span></h1>
        <Bars light />
      </div>
      <div className="rule" />
      <div className="foot">
        <div className="sub"><b>{props.subBold}</b>{props.sub}</div>
        <div className="who">
          <b>{props.whoLabel}</b>
          {props.whoLines.map((l) => <div key={l}>{l}</div>)}
          {props.badge ? <div className="badge">{props.badge}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function PartHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="part-head">
      <div className="tiny">{kicker}</div>
      <h2>{title}</h2>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}
