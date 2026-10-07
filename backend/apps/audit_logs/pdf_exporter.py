"""
Automated court-ready PDF generation service
(Module 5: Legal Warrant Generation).

Formats a tamper-evident forensic case package - incident summary,
victim statement, evidence manifest with integrity hashes, transaction
trail, and administrative actions taken - for submission to the
Ethiopian Federal Police Crime Investigation Bureau (Federal Police CIB).
"""
import hashlib
import io
from datetime import datetime

from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)


class ForensicWarrantPDFBuilder:
    def __init__(self, report, evidence_files, transaction_hops, audit_entries, investigative_notes=''):
        self.report = report
        self.evidence_files = evidence_files
        self.transaction_hops = transaction_hops
        self.audit_entries = audit_entries
        self.investigative_notes = investigative_notes
        self.styles = getSampleStyleSheet()
        self.styles.add(ParagraphStyle(name='NDSIRTitle', fontSize=16, leading=20, spaceAfter=12, textColor=colors.HexColor('#0B3D91')))
        self.styles.add(ParagraphStyle(name='NDSIRHeading', fontSize=12, leading=16, spaceAfter=8, textColor=colors.HexColor('#0B3D91')))

    def build(self) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                 leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        story = []

        story.append(Paragraph("Information Network Security Administration (INSA)", self.styles['NDSIRTitle']))
        story.append(Paragraph("National Digital Scam Incident Response System", self.styles['Normal']))
        story.append(Paragraph("Court-Ready Forensic Case Package", self.styles['NDSIRHeading']))
        story.append(Spacer(1, 0.5*cm))

        story.append(Paragraph(f"<b>Tracking Code:</b> {self.report.tracking_code}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Incident Type:</b> {self.report.get_incident_type_display()}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Reported Via:</b> {self.report.get_channel_display()}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Current Status:</b> {self.report.get_status_display()}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Risk Score:</b> {self.report.risk_score}/100", self.styles['Normal']))
        story.append(Paragraph(f"<b>Generated:</b> {datetime.utcnow().isoformat()}Z", self.styles['Normal']))
        story.append(Spacer(1, 0.4*cm))

        story.append(Paragraph("Victim Statement / Description", self.styles['NDSIRHeading']))
        story.append(Paragraph(self.report.description or 'No additional description provided.', self.styles['Normal']))
        story.append(Spacer(1, 0.4*cm))

        story.append(Paragraph("Evidence Manifest (Chain of Custody)", self.styles['NDSIRHeading']))
        evidence_table_data = [['Filename', 'Type', 'SHA-256 Hash', 'Authenticity']]
        for ev in self.evidence_files:
            evidence_table_data.append([
                ev.original_filename, ev.file_type, ev.file_hash_sha256[:16] + '...', ev.authenticity_flag
            ])
        story.append(self._table(evidence_table_data))
        story.append(Spacer(1, 0.4*cm))

        story.append(Paragraph("Multi-Hop Fund Traversal", self.styles['NDSIRHeading']))
        hop_table_data = [['Hop', 'Source Bank', 'Destination Bank', 'Destination Account', 'Amount (ETB)']]
        for hop in self.transaction_hops:
            hop_table_data.append([
                str(hop.hop_level), hop.source_bank, hop.destination_bank,
                hop.destination_account, f"{hop.amount:,.2f}"
            ])
        story.append(self._table(hop_table_data))
        story.append(Spacer(1, 0.4*cm))

        story.append(Paragraph("Administrative Actions Taken", self.styles['NDSIRHeading']))
        audit_table_data = [['Timestamp', 'Actor', 'Action', 'Status']]
        for entry in self.audit_entries:
            audit_table_data.append([
                entry.timestamp.strftime('%Y-%m-%d %H:%M UTC'),
                str(entry.actor), entry.action_type, entry.status_code
            ])
        story.append(self._table(audit_table_data))
        story.append(Spacer(1, 0.4*cm))

        if self.investigative_notes:
            story.append(Paragraph("Investigative Notes", self.styles['NDSIRHeading']))
            story.append(Paragraph(self.investigative_notes, self.styles['Normal']))
            story.append(Spacer(1, 0.4*cm))

        story.append(PageBreak())
        story.append(Paragraph("Certification", self.styles['NDSIRHeading']))
        story.append(Paragraph(
            "This package was compiled automatically by the NDSIR platform from data submitted "
            "by the victim and verified by INSA forensic analysts. It is provided to support a "
            "formal court order request and does not itself constitute a legal finding of fact.",
            self.styles['Normal']
        ))

        doc.build(story)
        return buffer.getvalue()

    def _table(self, data):
        table = Table(data, hAlign='LEFT')
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B3D91')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F0F0')]),
        ]))
        return table


def generate_and_hash_pdf(report, evidence_files, transaction_hops, audit_entries, investigative_notes=''):
    pdf_bytes = ForensicWarrantPDFBuilder(
        report, evidence_files, transaction_hops, audit_entries, investigative_notes
    ).build()
    pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
    return ContentFile(pdf_bytes, name=f"{report.tracking_code}_forensic_package.pdf"), pdf_hash
