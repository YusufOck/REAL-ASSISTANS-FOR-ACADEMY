#!/usr/bin/env bash
# Hata olursa dur
set -o errexit

# Kütüphaneleri yükle
pip install -r requirements.txt

# Static dosyaları topla (CSS/JS)
python manage.py collectstatic --no-input

# Veritabanını güncelle (Migration)
python manage.py migrate