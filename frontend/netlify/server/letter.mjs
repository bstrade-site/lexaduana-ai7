import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';

export function makeLetter(client, record) {
  const paragraph = (text, bold = false) => new Paragraph({
    spacing: { after: 170, line: 285 },
    children: [new TextRun({ text, bold })],
  });
  const today = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date());
  const document = new Document({
    title: record.subject,
    styles: { default: { document: { run: { font: 'Calibri', size: 23, color: '202020' } } } },
    sections: [{
      children: [
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 300 }, text: today }),
        paragraph('Señores'),
        paragraph('Dirección de Impuestos y Aduanas Nacionales – DIAN', true),
        paragraph(record.office),
        paragraph(`Asunto: ${record.subject}`, true),
        paragraph(`Referencia: ${record.act}  |  Interesado: ${client}`),
        ...record.body.split(/\r?\n/).filter((line) => line.trim()).map((line) => paragraph(line)),
        paragraph('Atentamente,'),
        paragraph(record.signer, true),
        paragraph(record.capacity),
        paragraph(record.contact),
        ...(record.attachments ? [paragraph('Anexos', true), ...record.attachments.split(/\r?\n/).filter(Boolean).map((line) => paragraph(line))] : []),
      ],
    }],
  });
  return Packer.toBuffer(document);
}
