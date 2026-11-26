# LexAduana · CEXTAC Business Group

Espacio interno de gestión aduanera. Los expedientes y sus revisiones se guardan en Netlify Database; los PDF originales se guardan de forma privada en Netlify Blobs. Netlify aplica la migración durante el despliegue.

## Acceso al espacio de trabajo

En el panel de Netlify, habilita **Google** en **Identity → Registration → External providers → Add provider**. Mantén el registro por invitación; `bs.trade@cextacbusinessgroup.com` ya tiene una cuenta confirmada y no necesita una nueva invitación. Después del despliegue, selecciona **Acceso al equipo → Continuar con Google** en el sitio de producción y elige la cuenta de Google con ese correo exacto.

La API valida la sesión contra la instancia de Identity de `lexaduana-ai.netlify.app` y solo autoriza ese correo confirmado. No depende del rol `equipo`. No hay rutas públicas a los expedientes. El cambio retira el formulario de contraseña de LexAduana, pero no modifica las credenciales ni revoca las sesiones ya emitidas por Identity para la cuenta autorizada.

## API

Todas las rutas requieren la sesión del navegador o un encabezado `Authorization: Bearer <JWT de Identity>` de una cuenta autorizada. Las solicitudes de escritura que usan cookies requieren el mismo origen. Los errores HTTP se devuelven como JSON con un campo `error`.

| Método y ruta | Uso |
| --- | --- |
| `GET /api/session` | Verifica el acceso de la cuenta. |
| `GET /api/cases?search=&offset=0` | Lista hasta 50 expedientes, con búsqueda por cliente o número de acto y totales de la cartera. |
| `POST /api/cases` | Recibe un formulario `multipart/form-data` con `client` y uno a cuatro campos `pdf` (primero el acto principal, hasta 8 MB en total). Devuelve `201` con el expediente archivado. |
| `GET /api/cases/:id` | Devuelve la ficha, el análisis disponible, la versión y los vencimientos calculados. |
| `POST /api/cases/:id/analysis` | Recibe `{"confirmProcessing":true}`. Genera el análisis con los PDF archivados y devuelve JSON por líneas: eventos `progress`, líneas vacías `{}` de mantenimiento y un evento final `result` o `error`. Un HTTP `200` no sustituye la comprobación de ese evento final. |
| `PATCH /api/cases/:id` | Guarda `client`, `record` completo y `version` obtenida con `GET`. Si otra persona guardó primero, responde `409`. |
| `GET /api/cases/:id/pdf/:index` | Descarga el PDF privado según su índice desde cero. |
| `GET /api/cases/:id/word` | Descarga un `.docx` cuando el escrito completo tiene una aprobación guardada. |

## Revisión antes del envío

El análisis extrae hechos, constancias y el valor que consta expresamente como declarado; no reemplaza un monto ausente por avalúo, sanción ni honorarios. El dictamen consulta una selección de artículos publicados en el Normograma DIAN y distingue la norma vigente de la que puede regir por transición. Su cobertura no sustituye la revisión jurídica del expediente ni de disposiciones especiales.

El sistema no equipara la fecha de expedición, entrega o notificación a la fecha base de un término. El equipo verifica la notificación, la norma y el evento inicial para cada término. Solo se calculan vencimientos expresados en días hábiles: se excluye la fecha base, fines de semana, festivos nacionales y las fechas adicionales registradas por el equipo. Los términos en otras unidades se revisan fuera de esa calculadora. El archivo Word queda listo para firma tras la revisión; el envío y la radicación son externos y sus constancias se anotan en la ficha.
