# LexAduana · CEXTAC Business Group

Espacio público de gestión aduanera. Los expedientes y sus revisiones se guardan en Netlify Database; los PDF originales se guardan en Netlify Blobs. Netlify aplica la migración durante el despliegue.

## Acceso al espacio de trabajo

La aplicación no tiene inicio de sesión propio. Si el despliegue está protegido por Netlify, primero se necesita acceso al sitio; el panel conserva esa sesión en las solicitudes a la API. En un despliegue público, cualquier visitante puede consultar y editar expedientes existentes, crear otros, descargar los PDF y ejecutar análisis. Las modificaciones se registran como anónimas. No uses un despliegue público para documentos confidenciales ni datos personales que no deban hacerse públicos.

## API

La aplicación no exige autenticación propia para las rutas de expedientes. La protección del despliegue configurada en Netlify, si existe, también se aplica a las rutas de la API. Las solicitudes de escritura con encabezado `Origin` deben venir del mismo origen que la API. Los errores HTTP de la aplicación se devuelven como JSON con un campo `error`.

| Método y ruta | Uso |
| --- | --- |
| `GET /api/cases?search=&offset=0` | Lista hasta 50 expedientes, con búsqueda por cliente o número de acto y totales de la cartera. |
| `POST /api/cases` | Recibe un formulario `multipart/form-data` con uno a cuatro campos `pdf` (primero el acto principal, hasta 8 MB en total). Devuelve `201` con el expediente archivado, sin requerir el nombre del cliente. |
| `GET /api/cases/:id` | Devuelve la ficha, el análisis disponible, la versión y los vencimientos calculados. |
| `POST /api/cases/:id/analysis` | Recibe `{"confirmProcessing":true}`. Actualiza la ficha con los PDF archivados y genera el dictamen y su hoja de ruta. Devuelve JSON por líneas: eventos `progress`, objetos `{}` de mantenimiento y un evento final `result` o `error`. Si solo se pudo llenar la ficha, `result` incluye `analysisWarning`. Un HTTP `200` no sustituye la comprobación del evento final. |
| `PATCH /api/cases/:id` | Guarda `version` y los campos manuales de `record`: `responded`, `filed`, `radicado`, `outcome`, `subject`, `signer`, `capacity`, `contact`, `body`, `attachments` y `reviewed`. Si la versión cambió, responde `409`. |
| `GET /api/cases/:id/pdf/:index` | Descarga el PDF según su índice desde cero. |
| `GET /api/cases/:id/word` | Descarga un `.docx` cuando el escrito completo tiene una aprobación guardada. |

## Revisión antes del envío

Tras cargar los PDF y autorizar su procesamiento, el panel inicia el análisis. La ficha guarda automáticamente el interesado, la identificación del acto, las constancias y el valor que figura expresamente como declarado; no reemplaza un monto ausente por avalúo, sanción ni honorarios. Los expedientes anteriores pueden volver a analizarse para actualizar la ficha y generar la hoja de ruta sin sobrescribir la respuesta, la radicación o la resolución registradas.

El dictamen consulta una selección de artículos del Normograma DIAN y distingue la norma vigente de la que puede regir por transición. La hoja de ruta es interna: ordena las actuaciones, indica responsable, momento, pruebas, entregables y alternativas cuando corresponda. No se incluye en el Word ni sustituye la revisión de un abogado aduanero.

El sistema no equipara la fecha de expedición, entrega o notificación a la fecha base de un término. Solo estima vencimientos si el término se expresa en días hábiles y el evento que fija la fecha base está acreditado; excluye la fecha base, fines de semana, festivos nacionales y, si existen, las exclusiones históricas del expediente. Verifica el cómputo y posibles suspensiones antes de actuar. El archivo Word queda listo para firma tras la revisión; el envío y la radicación son externos y sus constancias se anotan en la ficha.
