import { h } from "preact";

// Esboço (aws/0007), ported to Preact: the bucket → objeto → key diagram for the
// S3 Lesson. Ships defaults so the Aula references it bare. Semantic output 1:1
// with the `.astro` original — the `<figure class="bok">` root, one `.bok__obj`
// row per object, and the two scope rules as text the Aula teaches against.
// Authored with `h()`; styles in src/styles/sketches.css.
export interface S3Object {
  /** Leading glyph for the row, e.g. "📄". */
  icon: string;
  /** The object's key within the bucket, e.g. "faturas/2026/nf.pdf". */
  key: string;
  /** Right-aligned caption, e.g. "objeto · 240 KB + metadados". */
  meta: string;
}

interface Props {
  bucket?: string;
  objects?: S3Object[];
}

const DEFAULT_OBJECTS: S3Object[] = [
  { icon: "📄", key: "faturas/2026/06/nf-1837.pdf", meta: "objeto · 240 KB + metadados" },
  { icon: "🖼️", key: "avatars/user-42.png", meta: "objeto · 18 KB + metadados" },
];

export function BucketObjectKey({
  bucket = "caravela-uploads-prod",
  objects = DEFAULT_OBJECTS,
}: Props) {
  return h(
    "figure",
    { class: "bok", "data-sketch": "bucket-object-key" },
    h(
      "div",
      { class: "bok__bucket" },
      h(
        "div",
        { class: "bok__bucket-head" },
        "🪣 ",
        h("code", { class: "bok__bucket-name" }, bucket),
        h("span", { class: "bok__badge" }, "nome único no mundo"),
        h("span", { class: "bok__badge bok__badge--region" }, "vive em 1 região"),
      ),
      objects.map((o) =>
        h(
          "div",
          { class: "bok__obj" },
          h("span", { class: "bok__obj-icon", "aria-hidden": "true" }, o.icon),
          h("span", { class: "bok__key" }, o.key),
          h("span", { class: "bok__meta" }, o.meta),
        ),
      ),
    ),
    h(
      "figcaption",
      { class: "bok__note" },
      'A "/" na key é só ',
      h("b", null, "convenção visual"),
      " (prefixo). Não existe pasta de verdade — o namespace é ",
      h("b", null, "plano"),
      ".",
    ),
  );
}
