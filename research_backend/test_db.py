import psycopg2
import sys

# BURAYA settings.py içindeki linkini tırnak içine yapıştır:
DSN = "postgresql://postgres:MehmetProject2025@db.htjsmgqxsiajzxpqesdk.supabase.co:5432/postgres"

print(f"📡 Bağlantı deneniyor: {DSN.split('@')[1] if '@' in DSN else 'Link Hatali'}...")

try:
    conn = psycopg2.connect(DSN)
    print("✅ BAŞARILI! Veritabanına bağlandım.")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    record = cursor.fetchone()
    print("🌍 Sunucu Versiyonu:", record)
    conn.close()
except Exception as e:
    print("\n❌ HATA OLUŞTU!")
    print(f"Hata Türü: {type(e).__name__}")
    print(f"Hata Detayı: {e}")