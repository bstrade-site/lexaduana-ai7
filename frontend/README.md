# LexAduana · CEXTAC Business Group

Espacio público de gestión aduanera. Los expedientes y sus revisiones se guardan en Netlify Database; los PDF originales se guardan en Netlify Blobs. Netlify aplica la migración durante el despliegue.

## Acceso al espacio de trabajo

El panel abre sin contraseña, cuenta ni inicio de sesión. Cualquier visitante puede consultar y editar expedientes existentes, crear otros, descargar los PDF y ejecutar análisis. Las modificaciones se registran como anónimas. No uses este espacio para documentos confidenciales ni datos personales que no deban hacerse públicos.

## API

Las rutas de expedientes no requieren cookies ni encabezados de autenticación. Las solicitudes de escritura con encabezado `Origin` deben venir del mismo origen que la API; los clientes HTTP sin ese encabezado pueden usarla directamente. Los errores HTTP se devuelven como JSON con un campo `error`.

| Método y ruta | Uso |
| --- | --- |
| `GET /api/cases?search=&offset=0` | Lista hasta 50 expedientes, con búsqueda por cliente o número de acto y totales de la cartera. |
| `POST /api/cases` | Recibe un formulario `multipart/form-data` con `client` y uno a cuatro campos `pdf` (primero el acto principal, hasta 8 MB en total). Devuelve `201` con el expediente archivado. |
| `GET /api/cases/:id` | Devuelve la ficha, el análisis disponible, la versión y los vencimientos calculados. |
| `POST /api/cases/:id/analysis` | Recibe `{"confirmProcessing":true}`. Genera el análisis con los PDF archivados y devuelve JSON por líneas: eventos `progress`, líneas vacías `{}` de mantenimiento y un evento final `result` o `error`. Un HTTP `200` no sustituye la comprobación de ese evento final. |
| `PATCH /api/cases/:id` | Guarda `client`, `record` completo y `version` obtenida con `GET`. Si otra persona guardó primero, responde `409`. |
| `GET /api/cases/:id/pdf/:index` | Descarga el PDF según su índice desde cero. |
| `GET /api/cases/:id/word` | Descarga un `.docx` cuando el escrito completo tiene una aprobación guardada. |

## Revisión antes del envío

El análisis extrae hechos, constancias y el valor que consta expresamente como declarado; no reemplaza un monto ausente por avalúo, sanción ni honorarios. El dictamen consulta una selección de artículos publicados en el Normograma DIAN y distingue la norma vigente de la que puede regir por transición. Su cobertura no sustituye la revisión jurídica del expediente ni de disposiciones especiales.

El sistema no equipara la fecha de expedición, entrega o notificación a la fecha base de un término. El equipo verifica la notificación, la norma y el evento inicial para cada término. Solo se calculan vencimientos expresados en días hábiles: se excluye la fecha base, fines de semana, festivos nacionales y las fechas adicionales registradas por el equipo. Los términos en otras unidades se revisan fuera de esa calculadora. El archivo Word queda listo para firma tras la revisión; el envío y la radicación son externos y sus constancias se anotan en la ficha.
