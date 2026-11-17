# Fuentes de entrada

| Archivo local | Fuente | Uso |
|---|---|---|
| aif.xlsx | [DNAP · serie APNF 2025](https://www.argentina.gob.ar/sites/default/files/serie_aif-apnf-2025.xlsx) | Hoja Buenos Aires, 2005–2025, millones de pesos |
| 2026.xls | [DNAP · APNF a junio de 2026](https://www.argentina.gob.ar/sites/default/files/ejecuciones_presupuestarias_apnf_2026_-_trim_ii_0.xls) | Columna Buenos Aires, corte provisorio |
| muni.xlsx | [Transferencias acumuladas a septiembre 2026](https://www.ec.gba.gov.ar/areas/Sub_Politica_Coord_Eco/CoordMunicipal/municipios/09-26%20-%20Transferencias%20Septiembre%202026.xlsx) | Total y dos componentes, pesos |
| muni25.xlsx | [Transferencias acumuladas a diciembre 2025](https://www.ec.gba.gov.ar/areas/Sub_Politica_Coord_Eco/CoordMunicipal/municipios/12-25%20-%20Transferencias%20Diciembre%202025.xlsx) | Mismo detalle; intervalo de 12 meses |
| departamentos.geojson | [Georef · límite de partidos](https://apis.datos.gob.ar/georef/api/v2.0/departamentos.geojson) | Provincia 06; cuatro alias documentados en el importador |
| ipc.csv | [INDEC · series del IPC](https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_aperturas.csv) | Nivel general Pampeana, promedio de los doce meses de cada año |
| PBA-2027-Cuadro-Organismos.pdf | [Diputados Bonaerenses · transcripción del artículo 5°](https://diputados-fotos-scdev.nyc3.digitaloceanspaces.com/wp-content/uploads/2026/11/06140623/cuadro_organismos_presupuesto_2027.pdf) | 48 filas; suma reconciliada con el art. 4° |
| ley-15557.html | [Ley 15.557 · Presupuesto votado 2026](https://normas.gba.gob.ar/documentos/xAZogLSo.html) | Art. 5°, emparejamiento de 48 organismos |
| finalidad-dnap.xlsx | [DNAP · serie por finalidad y función](https://www.argentina.gob.ar/economia/sechacienda/coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/gastos-por) | Hoja Bs Aires, 2005–2025 |
| recaudacion-anual-oficial.xlsx | [Política Tributaria PBA · años anteriores](https://www.ec.gba.gov.ar/areas/hacienda/PolTributaria/Recaudacion/Recursos_OrigenProvincial_anosanteriores.xlsx) | 1999–2025, convertir según la unidad de cada hoja |
| recaudacion-2026-oficial.xlsx | [Política Tributaria PBA · 2026](https://www.ec.gba.gov.ar/areas/hacienda/PolTributaria/Recaudacion/Recaudaci%C3%B3n%20Provincial%202026_Prensa.xlsx) | Enero–septiembre, millones de pesos |
| transferencias-cat.csv | [Datos Abiertos PBA · Transferencias](https://catalogo.datos.gba.gob.ar/dataset/transferencias-municipios) | Coparticipación bruta de cada año completo; se omite Adolfo Alsina 2021 por dos valores en abril |
| consejos-cat.csv | [Datos Abiertos PBA · Consejos escolares](https://catalogo.datos.gba.gob.ar/dataset/tranferencias-consejos-escolares) | Giros registrados en enero–julio de 2025 y 2026 |
| pbg-cat.csv | [Datos Abiertos PBA · Producto Bruto Geográfico](https://catalogo.datos.gba.gob.ar/dataset/pbg) | Suma de sectores e impuestos, en millones corrientes |

El [Mensaje 4527](https://es.scribd.com/document/1093957637/PRESUPUESTO-pdf) y la [presentación del Ministerio de Economía](https://es.scribd.com/document/1093894694/Presentacion-Presupuesto-Impositiva-y-Financiamiento-2027-pdf) sostienen el resumen, los artículos 4° y 7° y las proyecciones de ingresos. Las partidas de obra de esta vista previa se cotejaron visualmente con la [Planilla 36](https://diputados-fotos-scdev.nyc3.digitaloceanspaces.com/wp-content/uploads/2026/11/16172813/Presupuesto-Obras-Diputados-Bonaerenses.pdf), en las páginas indicadas en cada fila.

`composition.json` conserva los desgloses publicados en millones en el Mensaje, el supuesto de inflación promedio anual del 21,4% para 2027 y el cierre consolidado municipal. Las finalidades legibles del Mensaje suman $39.589.891 menos que el total del artículo 4°. La diferencia se exhibe como residual. Los importes de las cuentas municipales surgen del gráfico 1 y el recuento de déficit y superávit, de la página impresa 8 del [informe provincial de finanzas municipales](https://www.ec.gba.gov.ar/areas/Sub_Politica_Coord_Eco/CoordMunicipal/informe/Evoluci%C3%B3n%20de%20las%20Finanzas%20Municipales%202016%20%E2%80%93%202025.pdf).
