# Gasto Público PBA

Sitio independiente de Gasto Público CABA, con identidad tipográfica de La Libertad Avanza · Provincia de Buenos Aires.

Dirección pública: [Gasto Público PBA](https://lfalcinelli.github.io/Presupuesto-PBA/).

- `npm run dev`: vista previa en `http://127.0.0.1:8772/Presupuesto-PBA/`.
- `npm run build`: sincroniza `assets/data.js` con `data/`. El sitio funciona también abriendo `index.html`, sin servidor ni servicios externos.
- `npm run build:pages`: prepara los archivos públicos en `dist/`. GitHub Actions valida los datos y publica esa carpeta desde `main`.
- `npm test`: controles de reconciliación, cobertura y referencias.

El sitio muestra el Proyecto 2027, el crédito inicial de 2026 y la ejecución en etapas identificadas. El flujo de portada se puede compartir con la composición, la unidad y las ramas abiertas. Los importes se guardan en pesos enteros, salvo partidas expresamente transcritas en millones. Los originales de trabajo quedan fuera del sitio.

Para regenerar las extracciones con Python (openpyxl, pypdf, xlrd y lxml), descargar [las fuentes de entrada](FUENTES.md) y ejecutar `python scripts/build-data.py /ruta/a/las/fuentes`, `python scripts/import-fiscal.py /ruta/a/las/fuentes`, `python scripts/import-additional-fiscal.py /ruta/a/las/fuentes` y `npm run build`. Verificar contra sus documentos las cifras del Mensaje, del informe municipal y de las obras revisadas.

Tipografía local [DM Sans](https://github.com/googlefonts/dm-fonts) bajo [SIL OFL 1.1](assets/dm-sans-OFL.txt).

Pendientes de datos para una versión más profunda: apertura programática completa, listado integral de obras por partido, ejecución con crédito vigente por organismo y cuentas propias por municipio. La comparación del proyecto con el crédito inicial 2026 usa una inflación promedio proyectada de 21,4%. Las series ejecutadas usan IPC observado.
