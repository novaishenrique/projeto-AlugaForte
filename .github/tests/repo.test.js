// Testes automáticos do repositório: README, site e documentação.
// Rodam no GitHub Actions a cada push. Localmente: node --test .github/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const raiz = path.resolve(__dirname, "..", "..");
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), "utf8");
const existe = (arquivo) => fs.existsSync(path.join(raiz, arquivo));

// Mesmo algoritmo que o GitHub usa para criar a âncora de um título
const ancora = (titulo) =>
  titulo.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");

const html = ler("site/index.html");
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const js = scripts.join("\n");

test("README: links, imagens e âncoras apontam para o que existe", () => {
  const readme = ler("README.md").replace(/```[\s\S]*?```/g, "");
  const ancoras = new Set([...readme.matchAll(/^#{1,6} (.+)$/gm)].map((m) => ancora(m[1])));
  const links = [
    ...[...readme.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]),
    ...[...readme.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1]),
  ].filter((link) => !/^(https?:|mailto:)/.test(link));
  for (const link of links) {
    const [alvo, fragmento] = decodeURI(link).split("#");
    if (alvo) assert.ok(existe(alvo), "link quebrado: " + link);
    else assert.ok(ancoras.has(fragmento), "âncora inexistente: #" + fragmento);
  }
});

test("a documentação e a capa estão no repositório", () => {
  for (const arquivo of ["docs/Documentacao_AlugaForte.pdf", ".github/capa.jpg"]) {
    assert.ok(existe(arquivo), "faltando: " + arquivo);
  }
  assert.strictEqual(fs.readFileSync(path.join(raiz, "docs/Documentacao_AlugaForte.pdf")).subarray(0, 5).toString(), "%PDF-");
});

test("site: página em português, com título", () => {
  assert.match(html, /<html lang="pt-BR"/);
  assert.match(html, /<title>[^<]*AlugaForte[^<]*<\/title>/);
});

test("site: o JavaScript não tem erro de sintaxe", () => {
  assert.ok(scripts.length >= 1, "nenhum script encontrado");
  assert.doesNotThrow(() => new vm.Script(js, { filename: "index.html" }));
});

test("site: todo botão chama uma função que existe", () => {
  const chamadas = [...html.matchAll(/on(?:click|submit|change|input)="\s*([A-Za-z_]\w*)\(/g)].map((m) => m[1]);
  const nativas = new Set(["alert", "event"]);
  const faltando = [...new Set(chamadas)].filter(
    (nome) => !nativas.has(nome) && !new RegExp(`function\\s+${nome}\\s*\\(`).test(js)
  );
  assert.deepStrictEqual(faltando, []);
});

test("site: o catálogo tem os três portes", () => {
  for (const porte of ["Pequeno porte", "Médio porte", "Grande porte"]) {
    assert.match(js, new RegExp(porte), "faltou " + porte);
  }
});
