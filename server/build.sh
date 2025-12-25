#!/usr/bin/env bash
# Hata olursa dur (Güvenlik kilidi)
set -o errexit

# 1. Kütüphaneleri yükle
pip install -r requirements.txt

# 2. Veritabanını güncelle (Migration) 🛰️
# Önce kablo bağlantılarını (şemayı) yapalım
python manage.py migrate

# 3. Static dosyaları topla (CSS/JS)
python manage.py collectstatic --no-input