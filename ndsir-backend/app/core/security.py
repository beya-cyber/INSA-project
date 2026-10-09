import hashlib
from PIL import Image
import os

def calculate_sha256(file_path: str) -> str:
    """
    Computes a cryptographic SHA-256 hash of an uploaded evidence file
    to establish legal chain-of-custody for court presentation.
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def sanitize_and_strip_exif(input_path: str, output_path: str) -> bool:
    """
    Removes EXIF metadata (GPS location, device IDs) from evidence images
    to sanitize the file before processing.
    """
    try:
        with Image.open(input_path) as img:
            data = list(img.getdata())
            image_without_exif = Image.new(img.mode, img.size)
            image_without_exif.putdata(data)
            image_without_exif.save(output_path)
        return True
    except Exception as e:
        print(f"Sanitization failed: {e}")
        return False