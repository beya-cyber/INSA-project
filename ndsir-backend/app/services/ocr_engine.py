import pytesseract
from PIL import Image
import re
from typing import Dict, Any, Optional

class ReceiptOCREngine:
    def __init__(self, tesseract_cmd: Optional[str] = None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def extract_text(self, image_path: str) -> str:
        """
        Parses text from an image using combined Amharic (amh) and English (eng) trained data.
        """
        with Image.open(image_path) as img:
            # Language configuration: amh (Ge'ez Script) + eng
            text = pytesseract.image_to_string(img, lang="amh+eng")
        return text

    def parse_receipt_data(self, raw_text: str) -> Dict[str, Any]:
        """
        Extracts transaction reference IDs, phone numbers, and transferred amounts
        using regular expressions tailored for Ethiopian payment apps.
        """
        extracted = {
            "transaction_reference": None,
            "account_number": None,
            "amount": None
        }

        # Match common Telebirr/CBE transaction patterns (e.g., FT24..., TXN..., 10-digit IDs)
        tx_match = re.search(r'\b(FT[A-Za-z0-9]{10,12}|[A-Z0-9]{10})\b', raw_text)
        if tx_match:
            extracted["transaction_reference"] = tx_match.group(1)

        # Match Ethiopian phone numbers (+251... or 09... or 07...)
        phone_match = re.search(r'(\+2519\d{8}|\+2517\d{8}|09\d{8}|07\d{8})', raw_text)
        if phone_match:
            extracted["account_number"] = phone_match.group(1)

        # Match currency amounts (e.g., 500.00 ETB, Birr 1000)
        amount_match = re.search(r'(\d+(?:\.\d{1,2})?)\s*(?:ETB|Birr|ብር)', raw_text, re.IGNORECASE)
        if amount_match:
            extracted["amount"] = float(amount_match.group(1))

        return extracted