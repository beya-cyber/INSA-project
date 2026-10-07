"""
OCR Metadata Extraction Engine (Module 1: Automated Metadata Parsing).
Parses transaction reference IDs, destination account numbers, source
phone numbers, and timestamps directly from raw evidence uploads.

Supports two pluggable backends selected via settings.OCR_ENGINE:
    - 'tesseract' (pytesseract) - fast, lightweight, good for clean screenshots
    - 'easyocr'   - deep-learning based, more robust to noisy/low-res images
"""
import re
import logging
from dataclasses import dataclass, asdict
from typing import Optional

from django.conf import settings

logger = logging.getLogger('ndsir')

# Regex heuristics tuned for Ethiopian mobile-money / bank receipt formats
TXN_REF_PATTERN = re.compile(r'(?:Txn|Transaction|Ref(?:erence)?)[\s#:]*([A-Z0-9]{6,20})', re.IGNORECASE)
ACCOUNT_PATTERN = re.compile(r'(?:Account|A/C|Acct)[\s#:]*([0-9\*]{6,20})', re.IGNORECASE)
PHONE_PATTERN = re.compile(r'(?:\+251|0)9\d{8}')
AMOUNT_PATTERN = re.compile(r'(?:ETB|Birr)\s?([\d,]+\.\d{2}|\d[\d,]*)', re.IGNORECASE)
TIMESTAMP_PATTERN = re.compile(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?')


@dataclass
class OCRExtractionResult:
    raw_text: str
    transaction_reference: Optional[str] = None
    destination_account: Optional[str] = None
    source_phone_number: Optional[str] = None
    amount: Optional[str] = None
    timestamp_text: Optional[str] = None
    engine_used: str = ''
    confidence_notes: str = ''

    def to_json(self):
        return asdict(self)


class OCRExtractionEngine:
    def __init__(self, engine: Optional[str] = None):
        self.engine = engine or settings.OCR_ENGINE

    def extract_text(self, image_path: str) -> str:
        if self.engine == 'easyocr':
            return self._extract_with_easyocr(image_path)
        return self._extract_with_tesseract(image_path)

    def _extract_with_tesseract(self, image_path: str) -> str:
        import pytesseract
        from PIL import Image

        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        image = Image.open(image_path)
        return pytesseract.image_to_string(image)

    def _extract_with_easyocr(self, image_path: str) -> str:
        import easyocr
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(image_path, detail=0)
        return '\n'.join(results)

    def parse(self, image_path: str) -> OCRExtractionResult:
        try:
            raw_text = self.extract_text(image_path)
        except Exception as exc:  # noqa: BLE001
            logger.error("OCR extraction failed for %s: %s", image_path, exc)
            return OCRExtractionResult(raw_text='', engine_used=self.engine,
                                        confidence_notes=f'extraction_error: {exc}')

        txn_match = TXN_REF_PATTERN.search(raw_text)
        acct_match = ACCOUNT_PATTERN.search(raw_text)
        phone_match = PHONE_PATTERN.search(raw_text)
        amount_match = AMOUNT_PATTERN.search(raw_text)
        ts_match = TIMESTAMP_PATTERN.search(raw_text)

        return OCRExtractionResult(
            raw_text=raw_text,
            transaction_reference=txn_match.group(1) if txn_match else None,
            destination_account=acct_match.group(1) if acct_match else None,
            source_phone_number=phone_match.group(0) if phone_match else None,
            amount=amount_match.group(1) if amount_match else None,
            timestamp_text=ts_match.group(0) if ts_match else None,
            engine_used=self.engine,
        )
