# BazaarFlow v0.1.0

BazaarFlow'un ilk kararlı sürümü.

BazaarFlow; ürün, stok, satış ve brüt kârlılığı tarayıcı üzerinde yerel olarak takip etmek için geliştirilmiş local-first bir uygulamadır. Stok maliyetleri FIFO yöntemiyle hesaplanır ve aynı ürünün farklı alış fiyatları ayrı stok partileri olarak korunur.

## Öne çıkanlar

- Ürün ve kategori yönetimi
- FIFO stok maliyetlendirme
- Farklı maliyetli stok partileri
- Hızlı Satış
- Geçmiş tarihli Toplu Satış
- Satış düzenleme ve iptal
- Stok düzeltmeleri
- Sepet toplamını yuvarlama ve oransal indirim dağıtımı
- Ciro / FIFO maliyeti / brüt kâr raporları
- Günlük, haftalık, aylık, yıllık ve özel tarih raporları
- Mobil POS odaklı arayüz
- JSON backup / restore
- CSV export
- Düşük stok uyarıları
- Responsive masaüstü ve mobil ekranlar

## Veri modeli

- Local-first
- IndexedDB / Dexie
- Database schema: v6
- Sunucu veya kullanıcı hesabı gerektirmez

> **Önemli:** v0.1.0 verileri kullanılan tarayıcı ve cihazda saklar. Tarayıcı verilerini temizlemeden veya cihaz değiştirmeden önce Ayarlar ekranından JSON yedeği alın.

## Teknik

- React 19
- TypeScript
- Vite 8
- Dexie / IndexedDB
- React Router
- Recharts
- Lucide React
- Oxlint

## v0.1.0 doğrulaması

Release öncesinde ürün/stok/satış/FIFO, geriye dönük hareketler, satış düzenleme ve iptal, raporlar, mobil/masaüstü görünüm, CSV dışa aktarma ve JSON backup/restore akışları uçtan uca test edildi.

Tam değişiklik listesi için `CHANGELOG.md` dosyasına bakın.
