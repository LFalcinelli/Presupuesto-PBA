# Gasto Público PBA

Sitio independiente de Gasto Público CABA, con identidad tipográfica de La Libertad Avanza · Provincia de Buenos Aires.

Dirección pública: [Gasto Público PBA](https://lfalcinelli.github.io/Presupuesto-PBA/).

- `npm run dev`: vista previa en `http://127.0.0.1:8772/Presupuesto-PBA/`.
- `npm run build`: sincroniza `assets/data.js` con `data/`. El sitio funciona también abriendo `index.html`, sin servidor ni servicios externos.
- `npm run build:pages`: prepara los archivos públicos en `dist/`. GitHub Actions valida los datos y publica esa carpeta desde `main`.
- `npm test`: controles de reconciliación, cobertura y referencias.

Datos al 17 de noviembre de 2026. El proyecto 2027 está separado del crédito inicial 2026 y de la ejecución. Los importes se guardan en pesos enteros, salvo partidas expresamente transcritas en millones. Los originales de trabajo quedan fuera del sitio.

Para regenerar las extracciones con Python (openpyxl, pypdf y xlrd), consultar [las fuentes de entrada](FUENTES.md), guardar los archivos con sus nombres indicados en un directorio y ejecutar `python scripts/build-data.py /ruta/a/las/fuentes` y `npm run build`. Las cifras provenientes del Mensaje y las obras revisadas se mantienen en JSON separado y deben comprobarse contra el documento antes de actualizarse.

Pendientes de datos para una versión más profunda: apertura programática completa, listado integral de obras por partido, ejecución con crédito vigente por organismo y conciliación del universo para comparar términos reales del proyecto con 2026. La selección de Planilla 36 no sustituye esa cobertura.
