# Gustavo Santos — Portfólio

Portfólio pessoal de Analista de Dados. Site estático (HTML, CSS e JS puros), sem etapa de build. Publicado no GitHub Pages.

**Conceito — "do dado bruto à decisão":** um campo 3D de partículas (WebGL) fica atrás da página e muda de forma conforme o scroll, seguindo o fluxo de trabalho com dados:

galáxia → nuvem caótica (extração) → malha (limpeza) → modelo estrela (modelagem) → loop (automação) → barras 3D (entrega) → onda (contato)

## Stack

- [Three.js](https://threejs.org/): partículas com shader próprio
- [GSAP + ScrollTrigger](https://gsap.com/): animações e controle pelo scroll
- [Lenis](https://lenis.darkroom.engineering/): scroll suave

As bibliotecas são carregadas por CDN.

## Rodar localmente

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Depois abra http://localhost:5500.

O site precisa de um servidor porque usa módulos ES. Abrir o `index.html` direto do disco não funciona.

## Estrutura

```
index.html        conteúdo do site
css/style.css     estilos
js/main.js        scroll, animações, cursor, menu, projetos
js/particles.js   cena WebGL (formas e shaders)
assets/           imagens, logos e favicon
```

## Como editar o conteúdo

O texto fica todo no `index.html`:

- **Novo projeto:** copie um bloco `<button class="prow" ...>` na seção `#projetos`. Depois crie o `<article class="modal__content" data-content="...">` correspondente.
- **Nova experiência:** copie um bloco `<details class="job">`.
- **Nova empresa no letreiro de logos:** coloque o arquivo em `assets/img/logos/` e adicione um `<img>` dentro de `.logos__track`, uma vez só. O JS repete os logos sozinho. Se um logo ficar grande ou pequeno demais, ajuste a escala com `style="--s: 0.5"`.
- **Nome no topo:** com um único `<span>` dentro de `.marquee__track`, o nome fica parado e ocupa a largura da tela. Com várias cópias, ele vira um letreiro em movimento.
- **Cores:** variáveis `--accent` e `--accent-2` no topo do `css/style.css`. As cores das partículas ficam em `uColorA` e `uColorB`, no `js/particles.js`.
