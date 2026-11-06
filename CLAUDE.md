# Portfolio Hub de Samuel

Este repo es **público**. No escribas aquí nada privado, ni siquiera en este archivo.

## Objetivo
Un portafolio en `samuelmtz1.github.io` que le consiga ofertas de empleo y freelance en web, creación de contenido y roles de IA. Un solo link para su CV, LinkedIn y propuestas.

**Posicionamiento:** AI-native builder. Dice abiertamente que construye dirigiendo herramientas de IA.

## Empieza aquí
El estado actual, qué mostrar de cada proyecto y lo pendiente están en `../Resume and job/reports/project-audits/hub-status.md`. Ese archivo es privado y vive fuera de este repo. Léelo antes de cambiar cualquier proyecto.

## Reglas que no se negocian

1. **Costo de $0 adicional.** GitHub Pages y Actions. Sin dominio propio ni APIs de pago. Los análisis con IA se hacen en sesiones manuales de Claude Code, nunca dentro de Actions.
2. **Veracidad.** Toda afirmación debe estar en `../Resume and job/profile/facts.md`. Si falta un dato, pregúntale a Samuel; si lo confirma, va primero a ese archivo. Nunca inventes métricas, usuarios ni resultados.
3. **Títulos de skills.** Usa "built with", no "expert in". No uses un título que los proyectos no demuestren. Revisa `facts.md`.
4. **Confirmación.** Avisa antes de hacer cambios. Nunca hagas push, crees repos ni cambies configuración de GitHub sin su confirmación. Nunca borres repos.
5. **UI/UX al final.** Samuel entregará un documento de identidad visual y guía de UI/UX antes de pulir el diseño. Espéralo.
6. **No compartir antes de tiempo.** El sitio no se indexa ni se enlaza desde el CV o LinkedIn hasta el lanzamiento.

## Nunca publicar
- Teléfono, situación fiscal o migratoria, ni tarifas o precios.
- Auditorías, valoraciones económicas, puntuaciones ni debilidades de proyectos.
- Secretos, credenciales ni datos personales de terceros.

Lo público de contacto es: correo, LinkedIn, GitHub y "Mexico City, remote, contractor, worldwide".

## Dónde vive cada cosa
| Qué | Dónde |
|---|---|
| Sitio | Este repo |
| Datos de cada proyecto | `src/content/projects/`, un archivo por proyecto |
| Presentación, skills y experiencia | `src/data/profile.json` |
| Demos | `public/demos/<nombre>/` |
| Agregar un proyecto | Comando `/add-project` |

**Demos:** copia solo los archivos que corren. Nunca copies un `CLAUDE.md`, un SOP ni links a artifacts privados. Todo lo que está en `public/` se publica aunque el proyecto esté oculto.

## Decisiones técnicas
- **Stack:** Astro y TypeScript, sitio estático, publicado en GitHub Pages con Actions.
- **Idioma:** inglés hoy. Los textos se guardan por idioma para agregar español y un botón de cambio en una versión futura.
- **Actions:** publica el sitio y actualiza solo datos básicos, como la fecha del último cambio.
- **Revisión:** `npm run build` corre `scripts/check-public.mjs`, que falla si encuentra datos privados o secretos.
- **Orden:** `order` y `pinned` en cada proyecto. Las puntuaciones viven fuera de este repo.

## Identidad visual
La guía visual (brief, referencias y prompt de fases) es privada y vive en `../Resume and job/reports/project-audits/identidad-visual-brief.md`. Léela antes de tocar el diseño.

## Al lanzar
Quita la etiqueta `noindex` de `src/layouts/Base.astro` y el bloqueo de `public/robots.txt`.
