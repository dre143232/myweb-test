# Pruebas de la app con Playwright CLI

Este proyecto usa [Playwright CLI](https://github.com/microsoft/playwright-cli) (`@playwright/cli`) para que Claude Code pruebe la app en un navegador real gastando pocos tokens: el CLI guarda snapshots, logs y capturas en `.playwright-cli/` (ignorado por git) en lugar de volcarlos en la conversación.

- Skill para Claude Code: `.claude/skills/playwright-cli/` (se regenera con `npm run pw:skills`)
- Configuración: `.playwright/cli.config.json` (Chromium, headless, viewport de 1280x800)

## Instalación

```bash
npm install
```

En local, si no tienes Chromium de Playwright:

```bash
npx playwright install chromium
```

En la nube de Claude Code ya hay un Chromium preinstalado. Indícalo con:

```bash
export PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium
```

## Cómo probar cada cosa

Usa `npx playwright-cli` o `npm run pw --`.

| Qué | Comandos |
| --- | --- |
| Abrir | `open http://localhost:3000` · `goto <url>` |
| Ver la página (barato) | `snapshot` · `find "texto"` |
| Botones | `click e12` · `click "getByRole('button', { name: 'Guardar' })"` |
| Formularios | `fill "getByLabel('Email')" "a@b.com"` · `select e5 valor` · `check e7` · `fill e3 "x" --submit` |
| Navegación | `click "getByRole('link', { name: 'Acerca' })"` · `go-back` · `reload` · `tab-list` |
| Login | rellenar y enviar, luego `state-save auth.json`; en sesiones siguientes `state-load auth.json` |
| Móvil | `open --device="iPhone 15" <url>` · `resize 375 812` · `eval "() => document.documentElement.scrollWidth > innerWidth"` (`true` = hay scroll horizontal) |
| Errores | `console error` · `requests` |
| Captura | `screenshot --filename=.playwright-cli/home-movil.png` (solo para revisar el diseño) |
| Cerrar | `close` · `close-all` |

Para ahorrar tokens, usa `snapshot` o `find` antes que `screenshot`, y prefiere los refs (`e12`) o los locators por rol o etiqueta a los selectores CSS.

Los archivos de estado de sesión (`auth.json`) contienen cookies. Guárdalos dentro de `.playwright-cli/` o añádelos a `.gitignore`.
