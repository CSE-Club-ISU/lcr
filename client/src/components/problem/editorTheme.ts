import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/**
 * Custom CodeMirror theme matching LCR's ISU editorial palette.
 * Mirrors the token plan in PLANNING.md (lines 419–435), rendered with
 * restraint: cardinal keywords, gold numbers, green strings, muted comments,
 * all on the warm-dark surface.
 */

const colors = {
  bg:       '#1A1614', // surface
  gutterBg: '#0F0D0D', // bg
  text:     '#F0EBE5',
  muted:    '#8A7F78',
  faint:    '#4F4744',
  surfaceAlt: '#221E1C',
  cardinal: '#C0272D',
  cardinalHover: '#D84A50',
  gold:     '#D4A017',
  goldBright: '#F5C518',
  green:    '#22C55E',
  blue:     '#6EA8FE',
  purple:   '#C3A3F0',
  selection:   'rgba(192, 39, 45, 0.32)',
  selectionBg: 'rgba(192, 39, 45, 0.22)',
  activeLine:  '#1F1B18',
};

export const lcrEditorTheme: Extension = EditorView.theme({
  '&': {
    color: colors.text,
    backgroundColor: colors.bg,
    fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
    fontFeatureSettings: '"liga", "calt"',
  },
  '.cm-content': {
    caretColor: colors.text,
    fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: colors.text,
    borderLeftWidth: '2px',
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: colors.selection,
  },
  '.cm-panels': { backgroundColor: colors.surfaceAlt, color: colors.text },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid rgba(240,235,229,0.08)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid rgba(240,235,229,0.08)' },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(245, 197, 24, 0.22)',
    outline: '1px solid rgba(245, 197, 24, 0.35)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(245, 197, 24, 0.45)',
  },
  '.cm-activeLine': { backgroundColor: colors.activeLine },
  '.cm-selectionMatch': { backgroundColor: colors.selectionBg },

  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    outline: `1px solid ${colors.goldBright}`,
    backgroundColor: 'rgba(245, 197, 24, 0.10)',
  },

  '.cm-gutters': {
    backgroundColor: colors.gutterBg,
    color: colors.faint,
    border: 'none',
    borderRight: '1px solid rgba(240,235,229,0.04)',
    fontFamily: 'var(--font-mono), monospace',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: colors.text,
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.muted,
  },
  '.cm-tooltip': {
    border: '1px solid rgba(240,235,229,0.1)',
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: colors.surfaceAlt,
    borderBottomColor: colors.surfaceAlt,
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: 'rgba(192, 39, 45, 0.18)',
      color: colors.text,
    },
  },
}, { dark: true });

const lcrHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword],
    color: colors.cardinal, fontWeight: '500' },
  { tag: [t.string, t.special(t.string), t.regexp],
    color: colors.green },
  { tag: [t.number, t.bool, t.null, t.atom],
    color: colors.goldBright },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: colors.muted, fontStyle: 'italic' },
  { tag: [t.className, t.typeName, t.namespace],
    color: colors.gold },
  { tag: [t.function(t.variableName), t.function(t.propertyName)],
    color: colors.blue },
  { tag: [t.variableName, t.propertyName],
    color: colors.text },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)],
    color: colors.text },
  { tag: [t.punctuation, t.separator, t.bracket, t.paren, t.brace],
    color: colors.muted },
  { tag: [t.operator],
    color: colors.cardinalHover },
  { tag: [t.meta, t.annotation],
    color: colors.purple },
  { tag: t.invalid,
    color: '#EF4444' },
  { tag: t.link,
    textDecoration: 'underline', color: colors.goldBright },
  { tag: t.heading,
    fontWeight: '600', color: colors.text },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
]);

export const lcrEditorExtensions: Extension[] = [
  lcrEditorTheme,
  syntaxHighlighting(lcrHighlight),
];
