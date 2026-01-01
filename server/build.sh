#!/usr/bin/env bash
# Hata olursa dur (Güvenlik kilidi)
set -o errexit

# 1. Kütüphaneleri yükle
# Projenin çalışması için gerekli tüm bağımlılıkları Python ortamına kurar
pip install -r requirements.txt

# 2. Static dosyaları topla (CSS/JS)
# Statik dosyaları 'staticfiles' klasöründe birleştirir. 
# Bu işlem veritabanı bağlantısı gerektirmediği için build aşamasında güvenlidir.
python manage.py collectstatic --no-input

# ⚠️ ÖNEMLİ NOT (Mentor Uyarısı):
# 'python manage.py migrate' komutunu build.sh içinde çalıştırmak risklidir.
# Veritabanı şeması güncellemelerini Render panelindeki "Start Command" 
# kısmına eklemeni öneririm. Örn:
# cd server && python manage.py migrate --noinput && gunicorn ...