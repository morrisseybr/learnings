import { test, expect } from "vitest";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";

import { CapexOpex } from "../src/sketches/preact/CapexOpex";
import { ResponsibilitySpectrum } from "../src/sketches/preact/ResponsibilitySpectrum";
import { RegionAzMap } from "../src/sketches/preact/RegionAzMap";
import { ScalingArchitecture } from "../src/sketches/preact/ScalingArchitecture";
import { OsiStack } from "../src/sketches/preact/OsiStack";
import { AutonomySpectrum } from "../src/sketches/preact/AutonomySpectrum";
import { PatternFlow } from "../src/sketches/preact/PatternFlow";
import { BucketObjectKey } from "../src/sketches/preact/BucketObjectKey";

// Seam B (Preact successor of the Container-API Esboço cases in sketches.test.ts
// / render.test.ts): each Esboço rendered to a string, asserting its semantic
// output. Astro's `data-astro-cid` scoping is gone off `.astro` — styles are now
// global (src/styles/sketches.css) — so the "on rails" invariant the Esboço keeps
// is "still a faithful *static* diagram": its root class is present and it ships
// no script / inline handler.
function assertStatic(html: string, rootSelector: RegExp): void {
  expect(html).toMatch(rootSelector);
  expect(html).not.toContain("onclick");
  expect(html).not.toContain("<script");
}

// --- CapexOpex ----------------------------------------------------------------

test("CapexOpex renders one card per model with its lead and bullet points", () => {
  const html = renderToString(
    h(CapexOpex, {
      models: [
        { tag: "Modelo antigo — CapEx", title: "CapEx", lead: "Compra adiantada.", points: ["Investimento alto", "Adivinha capacidade"] },
        { tag: "Modelo da nuvem — OpEx", title: "OpEx", lead: "Paga conforme usa.", points: ["Zero adiantado", "Sob demanda"], highlight: true },
      ],
    }),
  );

  expect((html.match(/data-sketch-card/g) ?? []).length).toBe(2);
  expect(html).toContain("CapEx");
  expect(html).toContain("OpEx");
  expect(html).toContain("Investimento alto");
  expect(html).toContain("Zero adiantado");
  expect((html.match(/data-highlight="true"/g) ?? []).length).toBe(1);
});

test("CapexOpex ships defaults so the Aula references it bare", () => {
  const html = renderToString(h(CapexOpex, null));
  expect(html).toContain("CapEx");
  expect(html).toContain("OpEx");
  assertStatic(html, /class="capex"/);
});

// --- ResponsibilitySpectrum ---------------------------------------------------

test("ResponsibilitySpectrum renders a row per model and marks who owns each layer", () => {
  const html = renderToString(
    h(ResponsibilitySpectrum, {
      layers: ["Aplicação", "Runtime / SO", "Rede / config", "Servidores físicos", "Data center"],
      rows: [
        { model: "IaaS", sub: "Infra como serviço", owned: 3 },
        { model: "PaaS", sub: "Plataforma como serviço", owned: 1 },
        { model: "SaaS", sub: "Software como serviço", owned: 0 },
      ],
    }),
  );

  expect((html.match(/data-spectrum-row/g) ?? []).length).toBe(3);
  expect(html).toContain("IaaS");
  expect(html).toContain("SaaS");
  // IaaS owns 3 layers, PaaS 1, SaaS 0 → 4 "you"-owned segments total.
  expect((html.match(/data-owner="you"/g) ?? []).length).toBe(4);
  // 3 rows × 5 layers = 15 segments; 15 − 4 = 11 owned by AWS.
  expect((html.match(/data-owner="aws"/g) ?? []).length).toBe(11);
});

test("ResponsibilitySpectrum is a static Esboço", () => {
  const html = renderToString(h(ResponsibilitySpectrum, null));
  assertStatic(html, /class="spectrum"/);
});

// --- RegionAzMap --------------------------------------------------------------

test("RegionAzMap renders the region and one cell per AZ with its data centers", () => {
  const html = renderToString(
    h(RegionAzMap, {
      region: { code: "sa-east-1", label: "São Paulo 🇧🇷" },
      azs: [
        { name: "AZ-a", dcs: 2 },
        { name: "AZ-b", dcs: 1 },
        { name: "AZ-c", dcs: 2 },
      ],
    }),
  );

  expect(html).toContain("sa-east-1");
  expect(html).toContain("São Paulo");
  expect((html.match(/data-az/g) ?? []).length).toBe(3);
  expect(html).toContain("AZ-a");
  // 2 + 1 + 2 = 5 data-center chips.
  expect((html.match(/data-dc/g) ?? []).length).toBe(5);
});

test("RegionAzMap is a static Esboço", () => {
  const html = renderToString(h(RegionAzMap, null));
  assertStatic(html, /class="geo"/);
});

// --- ScalingArchitecture ------------------------------------------------------

test("ScalingArchitecture renders the load balancer and one instance per AZ", () => {
  const html = renderToString(
    h(ScalingArchitecture, {
      elbLabel: "Elastic Load Balancing",
      instances: [
        { label: "EC2", az: "AZ-a" },
        { label: "EC2", az: "AZ-b" },
        { label: "EC2", az: "AZ-c" },
      ],
      asgNote: "Auto Scaling adiciona/remove instâncias",
    }),
  );

  expect(html).toContain("Elastic Load Balancing");
  expect((html.match(/data-inst/g) ?? []).length).toBe(3);
  expect(html).toContain("AZ-b");
  expect(html).toContain("Auto Scaling adiciona/remove instâncias");
});

test("ScalingArchitecture is a static Esboço", () => {
  const html = renderToString(h(ScalingArchitecture, null));
  assertStatic(html, /class="arch"/);
});

// --- OsiStack -----------------------------------------------------------------

test("OsiStack renders every layer and highlights the load-balancer layers", () => {
  const html = renderToString(h(OsiStack, null));

  // The canonical 7 layers.
  expect((html.match(/data-layer/g) ?? []).length).toBe(7);
  expect(html).toContain("Aplicação");
  expect(html).toContain("Física");
  // Exactly two layers are "hot" (L7 → ALB, L4 → NLB).
  expect((html.match(/data-hot="true"/g) ?? []).length).toBe(2);
  expect(html).toContain("ALB");
  expect(html).toContain("NLB");
});

test("OsiStack is a static Esboço", () => {
  const html = renderToString(h(OsiStack, null));
  assertStatic(html, /class="osi"/);
});

// --- AutonomySpectrum ---------------------------------------------------------

test("AutonomySpectrum renders one column per stop with its controller and body", () => {
  const html = renderToString(
    h(AutonomySpectrum, {
      stops: [
        { who: "Você controla", title: "Chamada única", body: "Um prompt, uma resposta." },
        { who: "Código controla", title: "Workflow", body: "Caminho fixo." },
        { who: "O modelo controla", title: "Agente", body: "Decide os próximos passos." },
      ],
      barLabels: ["fixo", "emergente"],
    }),
  );

  expect((html.match(/data-stop/g) ?? []).length).toBe(3);
  expect(html).toContain("Chamada única");
  expect(html).toContain("Agente");
  expect(html).toContain("O modelo controla");
  expect(html).toContain("data-bar");
  expect(html).toContain("emergente");
});

test("AutonomySpectrum is a static Esboço", () => {
  const html = renderToString(h(AutonomySpectrum, null));
  assertStatic(html, /class="autonomy"/);
});

// --- PatternFlow --------------------------------------------------------------

test("PatternFlow renders a node per stage entry and carries node variants", () => {
  const html = renderToString(
    h(PatternFlow, {
      stages: [
        { nodes: [{ label: "Entrada" }] },
        { nodes: [{ label: "LLM 1" }, { label: "LLM 2" }] },
        { nodes: [{ label: "Agregador", variant: "alt" }] },
      ],
    }),
  );

  // 1 + 2 + 1 = 4 nodes across the flow.
  expect((html.match(/data-node/g) ?? []).length).toBe(4);
  expect(html).toContain("Entrada");
  expect(html).toContain("LLM 1");
  expect(html).toContain("Agregador");
  expect(html).toContain('data-variant="alt"');
});

test("PatternFlow is a static Esboço", () => {
  const html = renderToString(
    h(PatternFlow, { stages: [{ nodes: [{ label: "Entrada" }] }, { nodes: [{ label: "Saída" }] }] }),
  );
  assertStatic(html, /class="flow"/);
});

// --- BucketObjectKey ----------------------------------------------------------

test("BucketObjectKey renders the bucket and one row per object key", () => {
  const html = renderToString(
    h(BucketObjectKey, {
      bucket: "caravela-uploads-prod",
      objects: [
        { icon: "📄", key: "faturas/2026/06/nf-1837.pdf", meta: "objeto · 240 KB" },
        { icon: "🖼️", key: "avatars/user-42.png", meta: "objeto · 18 KB" },
      ],
    }),
  );

  expect(html).toContain("caravela-uploads-prod");
  expect((html.match(/class="bok__obj"/g) ?? []).length).toBe(2);
  expect(html).toContain("faturas/2026/06/nf-1837.pdf");
  // The model's two scope rules travel as text the Aula can teach against.
  expect(html).toContain("nome único no mundo");
  expect(html).toContain("vive em 1 região");
});

test("BucketObjectKey ships defaults and is a static Esboço", () => {
  const html = renderToString(h(BucketObjectKey, null));
  expect(html).toContain("caravela-uploads-prod");
  expect(html).toMatch(/namespace é/);
  assertStatic(html, /class="bok"/);
});
