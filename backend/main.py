import os
import json
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from prompts import SYSTEM_PROMPT_EX_DIAN

app = FastAPI(title="LEXADUANA AI - Motor Jurídico Aduanero")

# Permite que tu página de Netlify se comunique con este servidor
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
origins = [FRONTEND_URL] if FRONTEND_URL != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Ruta para que UptimeRobot mantenga despierta tu API gratis las 24 horas
@app.get("/health")
def health_check():
    return {
        "estado": "activo",
        "sistema": "LEXADUANA AI",
        "fecha_servidor": datetime.now().strftime("%Y-%m-%d"),
    }


# Ruta principal que recibe los PDFs de la DIAN y genera la defensa
@app.post("/api/auditar-expediente")
async def auditar_expediente(
    acto_dian_pdf: Optional[UploadFile] = File(None),
    soportes_pdfs: Optional[List[UploadFile]] = File(None),
    contexto_adicional: str = Form(""),
    x_clave_abogado: Optional[str] = Header(None),
):
    # 1. Verificar contraseña personal (si configuraste una en Render)
    clave_servidor = os.getenv("CLAVE_ACCESO_ABOGADO")
    if clave_servidor and x_clave_abogado != clave_servidor:
        raise HTTPException(
            status_code=401, detail="Clave de acceso incorrecta."
        )

    # 2. Verificar llave de Google Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, detail="Falta configurar GEMINI_API_KEY en Render."
        )

    if not acto_dian_pdf and not contexto_adicional.strip():
        raise HTTPException(
            status_code=400,
            detail="Debes subir el PDF de la DIAN o pegar el texto del caso.",
        )

    client = genai.Client(api_key=api_key)
    contenidos = []

    # 3. Empaquetar el PDF principal de la DIAN
    if acto_dian_pdf:
        bytes_acto = await acto_dian_pdf.read()
        contenidos.append(
            "DOCUMENTO PRINCIPAL EXPEDIDO POR LA DIAN (Auditar sellos, fechas, firmas, causales y tablas):"
        )
        contenidos.append(
            types.Part.from_bytes(
                data=bytes_acto, mime_type="application/pdf"
            )
        )

    # 4. Empaquetar PDFs de documentos soporte (F-500, Factura, BL, Lista de Empaque, Origen)
    if soportes_pdfs:
        for doc in soportes_pdfs:
            if doc.filename:
                bytes_soporte = await doc.read()
                contenidos.append(
                    f"DOCUMENTO SOPORTE DE LA OPERACIÓN ({doc.filename}):"
                )
                contenidos.append(
                    types.Part.from_bytes(
                        data=bytes_soporte, mime_type="application/pdf"
                    )
                )

    # 5. Instrucción final con la fecha exacta de hoy
    fecha_hoy = datetime.now().strftime("%Y-%m-%d")
    instruccion = f"""
    Fecha actual para cómputo de términos: {fecha_hoy}.
    Notas o texto adicional suministrado por el usuario: {contexto_adicional}

    Realiza la auditoría procesal completa, el análisis sustancial integral y redacta tanto el Dictamen Ejecutivo como el Memorial de Defensa Aduanera listo para radicar ante la DIAN.
    """
    contenidos.append(instruccion)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contenidos,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT_EX_DIAN,
                temperature=0.25,
                response_mime_type="application/json",
            ),
        )
        resultado_json = json.loads(response.text)
        return resultado_json
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando el expediente: {str(e)}",
        )
