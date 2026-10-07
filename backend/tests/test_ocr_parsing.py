import pytest
from apps.forensics.ocr_engine import OCRExtractionEngine, TXN_REF_PATTERN, PHONE_PATTERN, AMOUNT_PATTERN


class TestOCRRegexHeuristics:
    def test_transaction_reference_pattern(self):
        text = "Transaction Ref: TXN9F82K1 completed successfully"
        match = TXN_REF_PATTERN.search(text)
        assert match is not None
        assert match.group(1) == 'TXN9F82K1'

    def test_phone_number_pattern_local_format(self):
        text = "Sender: 0912345678"
        match = PHONE_PATTERN.search(text)
        assert match is not None

    def test_amount_pattern(self):
        text = "Amount: ETB 15,500.00"
        match = AMOUNT_PATTERN.search(text)
        assert match is not None
        assert match.group(1) == '15,500.00'

    def test_parse_handles_missing_engine_gracefully(self, tmp_path):
        # Non-existent image path should degrade gracefully, not raise.
        fake_path = str(tmp_path / "nonexistent.png")
        result = OCRExtractionEngine(engine='tesseract').parse(fake_path)
        assert result.raw_text == ''
        assert 'extraction_error' in result.confidence_notes
