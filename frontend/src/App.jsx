import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  FileText,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Download,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Plus,
  Trash2,
  RefreshCw,
  BookOpen,
  Gavel,
  Sparkles,
  KeyRound,
  Server
} from 'lucide-react';

// Lee automáticamente la URL de Render configurada en Netlify (sin barra final duplicada)
const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

// Casos reales de referencia instantánea para probar la interfaz incluso antes de subir un PDF
const CASOS_DEMO = [
  {
    id: 'buenaventura',
    nombre: 'Caso Demo 1: Aprehensión Buenaventura (Error Seriales)',
    resumen_expediente: {
      tipo_acto: 'Acta de Aprehensión en Zona Primaria',
      numero_y_fecha: 'Acta No. 035-2026-004812 del 18 de noviembre de 2026',
      seccional_dian: 'Dirección Seccional de Aduanas de Buenaventura',
      riesgo_juridico: 'BAJO (con fuerte defensa)',
      plazo_respuesta: '15 días hábiles desde notificación para Documento de Objeción (Vence: 9 de diciembre de 2026)',
      estrategia_recomendada: 'Radicar Documento de Objeción exigiendo Análisis Integral Probatorio y entrega sin pago de rescate, solicitando remisión subsidiaria al Comité de Revisión de Aprehensiones.'
    },
    vicios_detectados: [
      {
        titulo: 'Falsa motivación por invocación del Decreto Ley 920 de 2023 (Inexequible)',
        gravedad: 'CRÍTICO',
        explicacion: 'El inspector fundamentó la diligencia citando numerales del Decreto Ley 920 de 2023, declarado inexequible por la Sentencia C-072 de 2025, omitiendo encuadrar la conducta en las causales taxativas vigentes de la Ley 2586 de 2026.',
        norma_aplicable: 'Sentencia C-072 de 2025 y Ley 2586 de 2026 (Principio de Legalidad y Tipicidad Estricta)'
      },
      {
        titulo: 'Omisión del Principio de Análisis Integral sobre Documentos Soporte',
        gravedad: 'ALTO',
        explicacion: 'La inversión de dos dígitos en el serial de 3 compresores industriales en la casilla 91 de la Declaración F-500 constituye un error formal de transcripción plenamente subsanado por la Factura Comercial, Lista de Empaque y BL obrantes en SYGA.',
        norma_aplicable: 'Ley 2586 de 2026 y Art. 177 del Decreto 1165 de 2019 (Prevalencia de lo Sustancial)'
      }
    ],
    dictamen_ejecutivo: `### 1. Veredicto Directo y Vencimiento Fatal
El Acta de Aprehensión presenta un **vicio insalvable de falsa motivación normativa** y desconoce abiertamente el análisis integral de los documentos soporte. Tienes plazo perentorio hasta el **9 de diciembre de 2026** para radicar el Documento de Objeción. **Recomendación central:** No pagar rescate todavía; pelear la revocatoria inmediata del acta y pedir en subsidio el Comité de Revisión de Aprehensiones.

### 2. Hallazgos de la Auditoría al Acto de la DIAN
* **Norma derogada/inexequible:** El funcionario aprehensor usó una plantilla desactualizada invocando el Decreto Ley 920 de 2023. En sede administrativa colombiana, un acto restrictivo de dominio fundado en norma expulsada del ordenamiento nace viciado de nulidad.
* **Plena identidad de la carga:** La mercancía inspeccionada físicamente coincide en subpartida arancelaria, marca, modelo, peso bruto y valor FOB con la Factura Comercial y la Lista de Empaque previas al levante. No estamos frente a "mercancía diferente" ni no presentada.

### 3. Escenario Financiero (UVT 2026 = $52.374 COP)
* **Vía A — Objeción Frontal (Recomendada):** Costo de rescate **$0 COP**. Tiempo estimado de decisión: 15 a 30 días hábiles. Sin afectación en INFAD ni estatus OEA.
* **Vía B — Legalización temprana con rescate (Solo si urge entrega comercial):** Vigilar el corte de demoras navieras (*demurrage*) del contenedor en Sociedad Portuaria de Buenaventura; si el costo logístico supera el rescate reducido aplicable bajo la Ley 2586 de 2026, evaluar legalización bajo protesta.

### 4. Documentos Urgentes para Anexar Hoy
1. Certificado de Existencia y Representación Legal vigente (menos de 30 días) y mandato aduanero.
2. Copia legible de Declaración de Importación F-500, Factura Comercial, Lista de Empaque y Conocimiento de Embarque (BL).
3. Certificación técnica del fabricante en el exterior aclarando la secuencia de seriales despachados en el contenedor.`,
    memorial_defensa: `Señores
DIRECCIÓN SECCIONAL DE ADUANAS DE BUENAVENTURA
División de Gestión Jurídica / División de Gestión de Fiscalización Aduanera
E. S. D.

REFERENCIA: DOCUMENTO DE OBJECIÓN CONTRA EL ACTA DE APREHENSIÓN No. 035-2026-004812 DEL 18 DE NOVIEMBRE DE 2026.
INTERVINIENTE: IMPORTADORA INDUSTRIAL DEL PACÍFICO S.A.S. – NIT 900.123.456-7

Respetados señores:

Obrando en mi calidad de apoderado especial de la sociedad IMPORTADORA INDUSTRIAL DEL PACÍFICO S.A.S., debidamente acreditada conforme al poder y certificado de Cámara de Comercio que se adjuntan, encontrándome dentro de la oportunidad procesal prevista en la Ley 2586 de 2026, acudo ante su Despacho con el fin de formular formal DOCUMENTO DE OBJECIÓN contra el Acta de Aprehensión de la referencia, solicitando se deje sin efecto la medida cautelar y se ordene la entrega inmediata de la mercancía.

I. SÍNTESIS FÁCTICA DE LA OPERACIÓN DE COMERCIO EXTERIOR

1. Mi representada adquirió en el exterior maquinaria industrial amparada bajo la Factura Comercial No. INV-8841 y despachada al puerto de Buenaventura mediante Conocimiento de Embarque (BL) No. MEDU9928172.
2. Presentada oportunamente la Declaración de Importación Formulario 500 y liquidados íntegramente los tributos aduaneros correspondientes, el sistema informático aduanero determinó inspección física en zona primaria.
3. Durante la diligencia del 18 de noviembre de 2026, el funcionario inspector dispuso la aprehensión de tres (3) unidades argumentando discrepancia alfanumérica en dos dígitos de los seriales digitados en la declaración, invocando como sustento normativo disposiciones del Decreto Ley 920 de 2023.

II. FUNDAMENTOS DE DERECHO Y CARGOS DE DEFENSA

CAPÍTULO PRIMERO: VICIO SUSTANCIAL DE MOTIVACIÓN POR INVOCACIÓN DE NORMA INEXEQUIBLE Y VIOLACIÓN DE LA TIPICIDAD ESTRICTA.

Resulta palmario que el acto de aprehensión adolece de falsa e indebida motivación normativa. Como bien conoce esa División de Gestión Jurídica, mediante la Sentencia C-072 de 2025 la Honorable Corte Constitucional declaró la inexequibilidad del Decreto Ley 920 de 2023, rigiendo en la actualidad de manera plena e imperativa la Ley 2586 de 2026. En materia sancionatoria y de decomiso aduanero rige el principio constitucional de legalidad y tipicidad estricta, proscribiéndose cualquier aplicación ultractiva desfavorable o analógica por parte del operador administrativo.

CAPÍTULO SEGUNDO: IMPROCEDENCIA DE LA MEDIDA A LA LUZ DEL ANÁLISIS INTEGRAL Y PREVALENCIA DEL DERECHO SUSTANCIAL.

Aunado a lo anterior, mal podría ese Despacho concluir que nos encontramos frente a mercancía diferente o no amparada por un simple lapsus calami en la transcripción de dos caracteres del serial en la casilla descriptiva de la Declaración de Importación, cuando del examen conjunto y sistemático de los documentos soporte exigidos por el artículo 177 del Decreto 1165 de 2019 (Factura Comercial, Lista de Empaque y Documento de Transporte, todos fechados y cargados con anterioridad a la presentación y aceptación de la declaración) se acredita de manera inequívoca la plena correspondencia de naturaleza, clasificación arancelaria, marca, modelo, cantidad y valor en aduanas.

Conforme a los parámetros de análisis integral y error formal no constitutivo de decomiso consagrados en la Ley 2586 de 2026 y desarrollados en el Concepto General DIAN 018626 de 2026, las inconsistencias meramente formales que no conllevan tratarse de mercancía distinta ni generan menor pago de tributos aduaneros o violación de restricciones legales no habilitan al Estado para privar del dominio al importador de buena fe exenta de culpa.

III. PRUEBAS

Solicito se tengan como pruebas documentales y se valoren integralmente:
1. Copia íntegra de la Declaración de Importación y recibo oficial de pago de tributos aduaneros.
2. Factura Comercial No. INV-8841 y Lista de Empaque certificada de origen, donde constan los números de serie exactos verificados físicamente en puerto.
3. Conocimiento de Embarque (BL) No. MEDU9928172.
4. Certificación técnica emitida por el proveedor extranjero sobre la trazabilidad de fabricación del lote despachado.

IV. PETICIONES

PRIMERA PRINCIPAL: Que se REVOQUE y deje sin efecto jurídico alguno el Acta de Aprehensión No. 035-2026-004812 del 18 de noviembre de 2026 y, en consecuencia, se ordene la improcedencia del decomiso y la ENTREGA INMEDIATA de la mercancía a mi poderdante sin pago de rescate alguno.

PRIMERA SUBSIDIARIA: En el evento remoto de no acceder de plano a la revocatoria directa de la medida cautelar, solicito remitir el expediente al COMITÉ DE REVISIÓN DE APREHENSIONES de la Dirección de Gestión de Fiscalización, suspendiendo términos conforme a la normativa vigente.

V. NOTIFICACIONES

Recibiré notificaciones electrónicas en el correo registrado en el RUT del interviniente y en la dirección procesal notificaciones@importadorapacifico.co.

Atentamente,

__________________________________________
NOMBRE DEL APODERADO / REPRESENTANTE LEGAL
C.C. No. [Completar]
T.P. No. [Completar] del C. S. de la J.`,
    normas_verificadas: [
      {
        norma: 'Ley 2586 de 2026',
        estado: 'VIGENTE 2026',
        aplicacion_caso: 'Régimen sancionatorio y de decomiso aplicable; regula causales taxativas de aprehensión, análisis integral y principio de favorabilidad.'
      },
      {
        norma: 'Decreto Ley 920 de 2023 (Sentencia C-072 de 2025)',
        estado: 'INEXEQUIBLE DETECTADA',
        aplicacion_caso: 'Invocada erróneamente en el acta; genera vicio crítico de motivación por pérdida de fuerza ejecutoria e inexequibilidad constitucional.'
      },
      {
        norma: 'Decreto 1165 de 2019 (Art. 177, mod. Decreto 659 de 2024)',
        estado: 'VIGENTE 2026',
        aplicacion_caso: 'Sustenta el valor probatorio de los documentos soporte de la Declaración de Importación.'
      },
      {
        norma: 'Concepto General DIAN 018626 de 2026',
        estado: 'VIGENTE 2026',
        aplicacion_caso: 'Doctrina oficial vinculante para funcionarios DIAN sobre transición normativa y aplicación favorable de la Ley 2586 de 2026.'
      }
    ]
  },
  {
    id: 'rea_bogota',
    nombre: 'Caso Demo 2: Requerimiento Especial Aduanero (Favorabilidad 2026)',
    resumen_expediente: {
      tipo_acto: 'Requerimiento Especial Aduanero (REA) – Control Posterior',
      numero_y_fecha: 'REA No. 03-238-2026-00914 del 12 de noviembre de 2026',
      seccional_dian: 'Dirección Seccional de Aduanas de Bogotá – Aeropuerto El Dorado',
      riesgo_juridico: 'MEDIO',
      plazo_respuesta: '15 días hábiles para Respuesta al REA o Allanamiento reducido (Vence: 4 de diciembre de 2026)',
      estrategia_recomendada: 'Exigir aplicación de oficio del Principio de Favorabilidad de la Ley 2586 de 2026 sobre operación de 2024 y desvirtuar reclasificación arancelaria con ficha técnica biomédica.'
    },
    vicios_detectados: [
      {
        titulo: 'Inaplicación del Principio de Favorabilidad de la Ley 2586 de 2026',
        gravedad: 'CRÍTICO',
        explicacion: 'Fiscalización liquida una sanción porcentual y sanción mínima bajo reglas anteriores para una importación de 2024, ignorando que la Ley 2586 de 2026 redujo la tasación y eliminó pisos sancionatorios antes de que exista acto en firme.',
        norma_aplicable: 'Ley 2586 de 2026 y Concepto General DIAN 018626 de 2026'
      },
      {
        titulo: 'Clasificación arancelaria propuesta sin estudio merceológico oficial',
        gravedad: 'ALTO',
        explicacion: 'La División de Fiscalización pretende mover un equipo médico de diagnóstico a una partida gravada con 10% de arancel basándose únicamente en folletos comerciales de internet sin análisis técnico de las Reglas Generales Interpretativas 1 y 6.',
        norma_aplicable: 'Decreto 1881 de 2021 (Arancel de Aduanas) y Decreto 1165 de 2019'
      }
    ],
    dictamen_ejecutivo: `### 1. Veredicto Directo y Vencimiento Fatal
Tienes un **Requerimiento Especial Aduanero (REA)** abierto en Bogotá con vencimiento fatal el **4 de diciembre de 2026**. La DIAN cuestiona la subpartida arancelaria de equipos biomédicos importados en 2024 y propone Liquidación Oficial de Revisión más multa. **Recomendación central:** Radicar Respuesta de Fondo al REA atacando la ausencia de prueba merceológica e invocando subsidiariamente la reducción sancionatoria por favorabilidad de la Ley 2586 de 2026.

### 2. Cálculo Comparativo en UVT 2026 ($52.374 COP)
* **Pretensión inicial DIAN (sin favorabilidad):** Mayor valor de tributos + sanción plena calculada sobre régimen anterior.
* **Escudo de Favorabilidad Ley 2586 de 2026:** Incluso en el peor escenario de reclasificación, la base sancionatoria disminuye sustancialmente al exigir la aplicación preferente de la ley posterior más benigna antes de la firmeza del acto administrativo.
* **Opción de Allanamiento:** Solo recomendable si el ingeniero biomédico confirma que el equipo no cumple la Nota Legal del Capítulo 90; de lo contrario, hay alta probabilidad de archivo en sede jurídica.`,
    memorial_defensa: `Señores
DIRECCIÓN SECCIONAL DE ADUANAS DE BOGOTÁ
División de Gestión Jurídica – Grupo Interno de Trabajo de Determinación y Sanciones
E. S. D.

REFERENCIA: RESPUESTA AL REQUERIMIENTO ESPECIAL ADUANERO No. 03-238-2026-00914 DEL 12 DE NOVIEMBRE DE 2026.
INVESTIGADO: BIOMÉDICA ANDINA S.A.S. – NIT 830.555.901-2

Respetados señores:

En ejercicio del derecho fundamental de contradicción y defensa, dentro del término legal procedo a dar formal RESPUESTA AL REQUERIMIENTO ESPECIAL ADUANERO de la referencia, oponiéndome a la propuesta de Liquidación Oficial de Revisión y sanción cambiaria/aduanera formulada por la División de Fiscalización, con fundamento en las siguientes razones técnicas y jurídicas:

I. IMPROCEDENCIA TÉCNICA DEL CAMBIO DE SUBPARTIDA ARANCELARIA

El acto preparatorio pretende desconocer la clasificación arancelaria declarada en la partida 90.18 del Arancel de Aduanas basándose en apreciaciones subjetivas carentes de dictamen merceológico o pronunciamiento de la Subdirección Técnica Aduanera. Conforme a las Reglas Generales Interpretativas 1 y 6 del Sistema Armonizado y al Registro Sanitario INVIMA aportado como documento soporte, la función principal e indisociable del dispositivo corresponde a monitoreo clínico especializado, exento de gravamen arancelario.

II. APLICACIÓN IMPERATIVA DEL PRINCIPIO DE FAVORABILIDAD (LEY 2586 DE 2026)

En gracia de discusión, y sin que ello implique aceptación de cargo alguno, advertimos al Despacho que tratándose de una actuación administrativa en curso que no ha cobrado firmeza ejecutoria, resulta vinculante de oficio la aplicación del Principio Constitucional y Legal de Favorabilidad consagrado expresamente en la Ley 2586 de 2026 y ratificado en el Concepto General DIAN 018626 de 2026, resultando jurídicamente inviable imponer tasaciones sancionatorias derogadas más gravosas para el administrado.

III. PETICIÓN PRINCIPAL

Solicito se ARCHIVE definitivamente la actuación administrativa iniciada mediante el Requerimiento Especial Aduanero No. 03-238-2026-00914 y se declare la firmeza y corrección de las Declaraciones de Importación auditadas.

Atentamente,

__________________________________________
APODERADO ESPECIAL / REPRESENTANTE LEGAL`,
    normas_verificadas: [
      {
        norma: 'Ley 2586 de 2026 (Principio de Favorabilidad)',
        estado: 'VIGENTE 2026',
        aplicacion_caso: 'Obliga a la DIAN a aplicar la norma sancionatoria más benigna a procesos de control posterior iniciados sobre operaciones previas que aún no estén en firme.'
      },
      {
        norma: 'Decreto 1165 de 2019 (Liquidación Oficial de Revisión)',
        estado: 'VIGENTE 2026',
        aplicacion_caso: 'Regula la carga de la prueba técnica en cabeza de la autoridad aduanera para desvirtuar la presunción de veracidad de la declaración.'
      }
    ]
  }
];

export default function App() {
  // Estados de conexión y seguridad
  const [claveAbogado, setClaveAbogado] = useState(() => localStorage.getItem('lexaduana_clave') || '');
  const [mostrarModalClave, setMostrarModalClave] = useState(false);
  const [estadoServidor, setEstadoServidor] = useState('verificando'); // 'activo' | 'dormido' | 'verificando'

  // Estados de carga de archivos reales PDF
  const [actoPdf, setActoPdf] = useState(null);
  const [actoPdfUrl, setActoPdfUrl] = useState(null);
  const [soportesPdfs, setSoportesPdfs] = useState([]);
  const [contextoAdicional, setContextoAdicional] = useState('');
  const [documentoVisorActivo, setDocumentoVisorActivo] = useState(null);

  // Estados de resultado jurídico e interfaz
  const [cargandoIA, setCargandoIA] = useState(false);
  const [etapaProgreso, setEtapaProgreso] = useState('');
  const [errorApi, setErrorApi] = useState('');
  const [expedienteActual, setExpedienteActual] = useState(CASOS_DEMO[0]);
  const [memorialEditable, setMemorialEditable] = useState(CASOS_DEMO[0].memorial_defensa);
  const [pestanaDerecha, setPestanaDerecha] = useState('dictamen'); // 'dictamen' | 'vicios' | 'memorial' | 'normas'
  const [pestanaIzquierda, setPestanaIzquierda] = useState('carga'); // 'carga' | 'visor'

  const inputActoRef = useRef(null);
  const inputSoportesRef = useRef(null);

  // Verificar salud del servidor en Render al abrir la app
  const verificarServidor = async () => {
    setEstadoServidor('verificando');
    try {
      const resp = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
      if (resp.ok) {
        setEstadoServidor('activo');
      } else {
        setEstadoServidor('dormido');
      }
    } catch {
      setEstadoServidor('dormido');
    }
  };

  useEffect(() => {
    verificarServidor();
  }, []);

  // Sincronizar texto editable del memorial cuando cambia el expediente
  useEffect(() => {
    if (expedienteActual?.memorial_defensa) {
      setMemorialEditable(expedienteActual.memorial_defensa);
    }
  }, [expedienteActual]);

  // Limpiar URLs temporales de memoria al cambiar PDF
  useEffect(() => {
    return () => {
      if (actoPdfUrl) URL.revokeObjectURL(actoPdfUrl);
    };
  }, [actoPdfUrl]);

  const guardarClave = (nuevaClave) => {
    setClaveAbogado(nuevaClave);
    localStorage.setItem('lexaduana_clave', nuevaClave);
    setMostrarModalClave(false);
  };

  const manejarSeleccionActoPdf = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrorApi('Por favor selecciona un archivo en formato PDF (.pdf).');
      return;
    }
    setErrorApi('');
    if (actoPdfUrl) URL.revokeObjectURL(actoPdfUrl);
    const nuevaUrl = URL.createObjectURL(file);
    setActoPdf(file);
    setActoPdfUrl(nuevaUrl);
    setDocumentoVisorActivo({ nombre: file.name, url: nuevaUrl, tipo: 'Acto Principal DIAN' });
  };

  const manejarSeleccionSoportes = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type === 'application/pdf');
    if (files.length === 0) return;
    const nuevos = files.map((f) => ({
      archivo: f,
      nombre: f.name,
      tamano: (f.size / 1024 / 1024).toFixed(2) + ' MB',
      url: URL.createObjectURL(f)
    }));
    setSoportesPdfs((prev) => [...prev, ...nuevos]);
  };

  const eliminarSoporte = (index) => {
    setSoportesPdfs((prev) => {
      const copia = [...prev];
      URL.revokeObjectURL(copia[index].url);
      copia.splice(index, 1);
      return copia;
    });
  };

  // Llamada real al Backend en Render (/api/auditar-expediente)
  const ejecutarAuditoriaReal = async () => {
    if (!actoPdf && !contextoAdicional.trim()) {
      setErrorApi('Debes subir el PDF del acto de la DIAN o escribir los datos del caso en el cuadro de notas.');
      return;
    }

    setErrorApi('');
    setCargandoIA(true);
    setEtapaProgreso('Leyendo sellos, fechas y tablas del PDF de la DIAN...');

    const timer1 = setTimeout(() => {
      setEtapaProgreso('Auditando vicios procesales, competencia y vigencia Ley 2586 de 2026...');
    }, 5000);

    const timer2 = setTimeout(() => {
      setEtapaProgreso('Cruzando documentos soporte y redactando Memorial Forense Ex-DIAN...');
    }, 12000);

    try {
      const formData = new FormData();
      if (actoPdf) {
        formData.append('acto_dian_pdf', actoPdf);
      }
      soportesPdfs.forEach((item) => {
        formData.append('soportes_pdfs', item.archivo);
      });
      formData.append('contexto_adicional', contextoAdicional);

      const headers = {};
      if (claveAbogado.trim()) {
        headers['x-clave-abogado'] = claveAbogado.trim();
      }

      const response = await fetch(`${API_BASE_URL}/api/auditar-expediente`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (response.status === 401) {
        setMostrarModalClave(true);
        throw new Error('Tu servidor pidió la Clave de Acceso Personal. Ingrésala en la ventana de seguridad.');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error del servidor (${response.status}). Verifica que Render esté activo.`);
      }

      const data = await response.json();
      setExpedienteActual(data);
      setPestanaDerecha('dictamen');
      setEstadoServidor('activo');
    } catch (err) {
      setErrorApi(err.message || 'No se pudo conectar con tu API en Render. Revisa VITE_API_URL en Netlify.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setCargandoIA(false);
      setEtapaProgreso('');
    }
  };

  // Exportar el memorial listo para abrir y firmar en Microsoft Word (.doc)
  const descargarMemorialWord = () => {
    const contenidoHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Memorial Defensa DIAN</title>
      <style>
        body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; text-align: justify; margin: 2.5cm; }
        pre { font-family: 'Arial', sans-serif; white-space: pre-wrap; text-align: justify; }
      </style>
      </head>
      <body><pre>${memorialEditable}</pre></body>
      </html>
    `;
    const blob = new Blob(['\ufeff', contenidoHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Memorial_Defensa_DIAN_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const badgeRiesgo = (riesgo = '') => {
    const texto = riesgo.toUpperCase();
    if (texto.includes('ALTO')) return 'bg-red-500/15 text-red-300 border-red-500/30';
    if (texto.includes('MEDIO')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* BARRA SUPERIOR EJECUTIVA */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">LEXADUANA AI</h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Ley 2586 de 2026 Vigente
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditoría Forense Ex-DIAN • Control Estricto de Vigencia • Litigio Aduanero Colombiano
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Estado de conexión con Render */}
            <button
              onClick={verificarServidor}
              title={`Conectado a: ${API_BASE_URL}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs hover:border-slate-600 transition"
            >
              <Server className="w-3.5 h-3.5 text-slate-400" />
              {estadoServidor === 'activo' && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  API Render Activa
                </span>
              )}
              {estadoServidor === 'verificando' && (
                <span className="text-amber-300">Verificando API...</span>
              )}
              {estadoServidor === 'dormido' && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <RefreshCw className="w-3 h-3" />
                  Despertar API Render
                </span>
              )}
            </button>

            {/* Botón de Clave de Acceso */}
            <button
              onClick={() => setMostrarModalClave(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              {claveAbogado ? 'Clave Guardada' : 'Clave de Acceso'}
            </button>

            {/* Selector rápido de casos de referencia */}
            <select
              onChange={(e) => {
                const encontrado = CASOS_DEMO.find((c) => c.id === e.target.value);
                if (encontrado) setExpedienteActual(encontrado);
              }}
              defaultValue={CASOS_DEMO[0].id}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {CASOS_DEMO.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL DIVIDIDO EN 2 COLUMNAS */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* COLUMNA IZQUIERDA: INGESTA DE PDFs DE LA DIAN Y VISOR (5 columnas) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Pestañas del panel izquierdo */}
            <div className="flex border-b border-slate-800 bg-slate-900/60">
              <button
                onClick={() => setPestanaIzquierda('carga')}
                className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  pestanaIzquierda === 'carga'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Subir Expediente PDF
              </button>
              <button
                onClick={() => setPestanaIzquierda('visor')}
                className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  pestanaIzquierda === 'visor'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                Visor PDF Original {actoPdf ? '(1)' : ''}
              </button>
            </div>

            {pestanaIzquierda === 'carga' ? (
              <div className="p-5 space-y-5">
                {/* 1. Carga del Acto Principal DIAN */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    1. Acto Administrativo DIAN (PDF Escaneado o Digital)
                  </label>
                  <input
                    ref={inputActoRef}
                    type="file"
                    accept="application/pdf"
                    onChange={manejarSeleccionActoPdf}
                    className="hidden"
                  />

                  {!actoPdf ? (
                    <div
                      onClick={() => inputActoRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/50 rounded-xl p-6 text-center cursor-pointer transition group"
                    >
                      <FileText className="w-9 h-9 text-slate-500 group-hover:text-amber-400 mx-auto mb-2 transition" />
                      <p className="text-sm font-medium text-slate-200">
                        Haz clic para subir el PDF de la DIAN
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Acta de Aprehensión, REA, Acta de Hechos, Decomiso o Liquidación Oficial
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{actoPdf.name}</p>
                          <p className="text-[11px] text-emerald-300">
                            {(actoPdf.size / 1024 / 1024).toFixed(2)} MB • Listo para lectura forense
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setDocumentoVisorActivo({
                              nombre: actoPdf.name,
                              url: actoPdfUrl,
                              tipo: 'Acto Principal DIAN'
                            });
                            setPestanaIzquierda('visor');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                          title="Ver PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActoPdf(null);
                            setActoPdfUrl(null);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400"
                          title="Quitar archivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Carga de Documentos Soporte */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      2. Documentos Soporte en PDF (Opcional, Recomendado)
                    </label>
                    <button
                      onClick={() => inputSoportesRef.current?.click()}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar PDFs
                    </button>
                  </div>
                  <input
                    ref={inputSoportesRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={manejarSeleccionSoportes}
                    className="hidden"
                  />

                  {soportesPdfs.length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                      Puedes adjuntar Declaración de Importación (F-500), Factura Comercial, Lista de Empaque, BL/Guía Aérea o Certificados de Origen para activar el <strong>Análisis Integral</strong>.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {soportesPdfs.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                        >
                          <span className="truncate text-slate-200 max-w-[210px]">{doc.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">{doc.tamano}</span>
                            <button
                              onClick={() => {
                                setDocumentoVisorActivo({
                                  nombre: doc.nombre,
                                  url: doc.url,
                                  tipo: 'Documento Soporte'
                                });
                                setPestanaIzquierda('visor');
                              }}
                              className="text-slate-400 hover:text-amber-400"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => eliminarSoporte(idx)}
                              className="text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Contexto o texto adicional */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    3. Notas del Caso o Texto del Acta (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={contextoAdicional}
                    onChange={(e) => setContextoAdicional(e.target.value)}
                    placeholder="Ej: La notificación electrónica llegó el 20 de noviembre a las 4:30 pm. El contenedor sigue en puerto pagando USD 140 diarios de demoras..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Mensajes de Error */}
                {errorApi && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-200">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorApi}</span>
                  </div>
                )}

                {/* Botón Principal de Ejecución */}
                <button
                  onClick={ejecutarAuditoriaReal}
                  disabled={cargandoIA}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition"
                >
                  {cargandoIA ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando Expediente en Render...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Auditar Expediente y Redactar Defensa</span>
                    </>
                  )}
                </button>

                {cargandoIA && (
                  <div className="text-center text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2 px-3 animate-pulse">
                    {etapaProgreso}
                  </div>
                )}
              </div>
            ) : (
              /* VISOR INTEGRADO DE PDFs */
              <div className="p-4 flex flex-col h-[540px]">
                {documentoVisorActivo ? (
                  <>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                      <div className="truncate">
                        <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold block">
                          {documentoVisorActivo.tipo}
                        </span>
                        <span className="text-xs text-slate-200 font-medium truncate">
                          {documentoVisorActivo.nombre}
                        </span>
                      </div>
                    </div>
                    <iframe
                      src={documentoVisorActivo.url}
                      title="Visor PDF DIAN"
                      className="w-full flex-1 rounded-xl border border-slate-800 bg-white"
                    />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <FileText className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm font-medium text-slate-300">Ningún PDF cargado todavía</p>
                    <p className="text-xs mt-1">
                      Sube un Acta de Aprehensión o Requerimiento en la pestaña anterior para visualizarlo aquí junto al memorial.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* COLUMNA DERECHA: DICTAMEN, VICIOS, MEMORIAL EDITABLE Y NORMAS (7 columnas) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Tarjeta Resumen del Expediente */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  {expedienteActual?.resumen_expediente?.seccional_dian || 'Dirección Seccional DIAN'}
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {expedienteActual?.resumen_expediente?.tipo_acto} —{' '}
                  <span className="text-slate-300 font-normal">
                    {expedienteActual?.resumen_expediente?.numero_y_fecha}
                  </span>
                </h2>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeRiesgo(
                  expedienteActual?.resumen_expediente?.riesgo_juridico
                )}`}
              >
                Riesgo: {expedienteActual?.resumen_expediente?.riesgo_juridico}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80">
                <span className="text-slate-400 block mb-1 font-medium">Término Legal y Vencimiento:</span>
                <p className="text-amber-300 font-semibold">
                  {expedienteActual?.resumen_expediente?.plazo_respuesta}
                </p>
              </div>
              <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80">
                <span className="text-slate-400 block mb-1 font-medium">Estrategia Ex-DIAN Recomendada:</span>
                <p className="text-slate-200">
                  {expedienteActual?.resumen_expediente?.estrategia_recomendada}
                </p>
              </div>
            </div>
          </div>

          {/* Panel de 4 Pestañas Jurídicas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col">
            <div className="flex flex-wrap border-b border-slate-800 bg-slate-950/40">
              <button
                onClick={() => setPestanaDerecha('dictamen')}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 transition ${
                  pestanaDerecha === 'dictamen'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Dictamen Ejecutivo
              </button>

              <button
                onClick={() => setPestanaDerecha('vicios')}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 transition ${
                  pestanaDerecha === 'vicios'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Vicios Detectados ({expedienteActual?.vicios_detectados?.length || 0})
              </button>

              <button
                onClick={() => setPestanaDerecha('memorial')}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 transition ${
                  pestanaDerecha === 'memorial'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gavel className="w-4 h-4" />
                Memorial para Radicar
              </button>

              <button
                onClick={() => setPestanaDerecha('normas')}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 transition ${
                  pestanaDerecha === 'normas'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Control de Vigencia
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto max-h-[600px]">
              {/* PESTAÑA 1: DICTAMEN EJECUTIVO */}
              {pestanaDerecha === 'dictamen' && (
                <div className="space-y-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {expedienteActual?.dictamen_ejecutivo}
                </div>
              )}

              {/* PESTAÑA 2: VICIOS PROCESALES Y SUSTANCIALES */}
              {pestanaDerecha === 'vicios' && (
                <div className="space-y-3">
                  {(expedienteActual?.vicios_detectados || []).map((vicio, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white">{vicio.titulo}</h3>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            vicio.gravedad === 'CRÍTICO'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {vicio.gravedad}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{vicio.explicacion}</p>
                      <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                        <strong>Sustento Normativo Vigente:</strong> {vicio.norma_aplicable}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PESTAÑA 3: MEMORIAL EDITABLE Y DESCARGABLE A WORD */}
              {pestanaDerecha === 'memorial' && (
                <div className="space-y-3 flex flex-col h-full">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-xs text-slate-400">
                      Puedes editar cualquier dato o nombre antes de exportar a Word:
                    </span>
                    <button
                      onClick={descargarMemorialWord}
                      className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Memorial en Word (.doc)
                    </button>
                  </div>
                  <textarea
                    value={memorialEditable}
                    onChange={(e) => setMemorialEditable(e.target.value)}
                    rows={18}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-100 leading-relaxed focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* PESTAÑA 4: TABLA DE VERIFICACIÓN DE VIGENCIA NORMATIVA */}
              {pestanaDerecha === 'normas' && (
                <div className="space-y-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200">
                    <strong>Filtro Anti-Derogatorias Activo:</strong> Bloqueo estricto del Decreto Ley 920 de 2023 (Inexequible por Sentencia C-072 de 2025) y verificación contra Ley 2586 de 2026 y Decreto 1165 de 2019.
                  </div>
                  {(expedienteActual?.normas_verificadas || []).map((n, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{n.norma}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            n.estado?.includes('INEXEQUIBLE')
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {n.estado}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{n.aplicacion_caso}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* MODAL DE CLAVE DE ACCESO PERSONAL */}
      {mostrarModalClave && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Clave de Acceso del Abogado</h3>
                <p className="text-xs text-slate-400">
                  Debe coincidir con la variable CLAVE_ACCESO_ABOGADO de Render
                </p>
              </div>
            </div>

            <input
              type="password"
              value={claveAbogado}
              onChange={(e) => setClaveAbogado(e.target.value)}
              placeholder="Escribe tu clave secreta..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMostrarModalClave(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cerrar
              </button>
              <button
                onClick={() => guardarClave(claveAbogado)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
              >
                Guardar Clave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
