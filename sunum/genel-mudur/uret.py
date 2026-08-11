#!/usr/bin/env python3
"""genel-mudur.tpl.html → genel-mudur.html (tek dosya, kendi kendine yeten)

Artifact olarak yayınlanacağı için sayfa DIŞARIYA HİÇBİR İSTEK atamaz:
font CDN'i ve <img src="dosya.png"> çalışmaz (katı CSP). Bu yüzden
fontlar ve ekran görüntüleri data URI olarak gömülür.

Türkçe için latin VE latin-ext alt kümelerinin ikisi de gerekli —
ğ/ı/ş/İ latin-ext'te. Biri eksikse harfler sessizce yedek fonta düşer.

    python3 sunum/genel-mudur/uret.py [cikti.html]
"""
import base64
import pathlib
import sys

BURASI = pathlib.Path(__file__).resolve().parent
SUNUM = BURASI.parent

LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2122,U+2212"
EXT = ("U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,U+2113,"
       "U+2C60-2C7F,U+A720-A7FF")

FONTLAR = [
    ("IBM Plex Sans", 400, "ibm-plex-sans-latin-400-normal.woff2", LATIN),
    ("IBM Plex Sans", 400, "ibm-plex-sans-latin-ext-400-normal.woff2", EXT),
    ("IBM Plex Sans", 600, "ibm-plex-sans-latin-600-normal.woff2", LATIN),
    ("IBM Plex Sans", 600, "ibm-plex-sans-latin-ext-600-normal.woff2", EXT),
    ("IBM Plex Sans", 700, "ibm-plex-sans-latin-700-normal.woff2", LATIN),
    ("IBM Plex Sans", 700, "ibm-plex-sans-latin-ext-700-normal.woff2", EXT),
    ("Saira Condensed", 700, "saira-condensed-latin-700-normal.woff2", LATIN),
    ("Saira Condensed", 700, "saira-condensed-latin-ext-700-normal.woff2", EXT),
]

GORSELLER = ["durus-sebepleri", "palet-cikis-listesi"]


def b64(yol: pathlib.Path) -> str:
    return base64.b64encode(yol.read_bytes()).decode()


def main() -> None:
    sablon = (BURASI / "genel-mudur.tpl.html").read_text(encoding="utf-8")

    yuzler = []
    for aile, agirlik, dosya, aralik in FONTLAR:
        yol = SUNUM / "fonts" / dosya
        yuzler.append(
            f"@font-face{{font-family:'{aile}';font-style:normal;"
            f"font-weight:{agirlik};font-display:swap;"
            f"src:url(data:font/woff2;base64,{b64(yol)}) format('woff2');"
            f"unicode-range:{aralik}}}"
        )
    cikti = sablon.replace("/*FONTS*/", "\n".join(yuzler))

    for ad in GORSELLER:
        yol = SUNUM / "gorseller" / f"{ad}.png"
        if not yol.exists():
            raise SystemExit(
                f"Eksik görsel: {yol}\n"
                "Önce `node sunum/uretim/shots.cjs` çalıştırın "
                "(vite sunucusu ayakta olmalı)."
            )
        cikti = cikti.replace(
            f"/*GORSEL:{ad}*/", "data:image/png;base64," + b64(yol))

    hedef = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else BURASI / "genel-mudur.html"
    hedef.write_text(cikti, encoding="utf-8")
    print(f"✓ {hedef}  ({len(cikti.encode()) / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
