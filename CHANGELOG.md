# Changelog

BazaarFlow'daki kullanıcıya dönük önemli değişiklikler bu dosyada tutulur.

## [0.1.0] - 2026-09-14

İlk kararlı public sürüm.

### Eklendi

- Ürün ve kategori yönetimi
- Minimum stok seviyeleri ve düşük stok uyarıları
- FIFO stok partileri ve farklı alış maliyetleri
- Açılış stoku ve normal stok alımı
- Stok artırma / azaltma düzeltmeleri
- Hızlı Satış ekranı
- Geçmiş tarihli Toplu Satış
- Satış düzenleme ve iptal
- Sepet toplamı yuvarlama ve oransal sepet indirimi
- Günlük, haftalık, aylık, yıllık ve özel tarih raporları
- Ürün performansı, en çok satan ve en kârlı ürünler
- Stok değeri ve dashboard özetleri
- JSON yedekleme / geri yükleme
- CSV satış dışa aktarma
- Mobil özel Hızlı Satış, Stok, Ürünler ve Daha Fazla ekranları
- Mobil Satış Geçmişi, Raporlar, Genel Bakış ve Ayarlar
- Responsive lazy loading yapısı
- 404 ekranı
- Ortak yükleniyor görünümü
- BazaarFlow onay dialogları

### İyileştirildi

- Normal satışlar için FIFO fast-path
- FIFO preview sorgularının yalnız ilgili ürünlerle sınırlandırılması
- Geriye dönük satışlarda güvenli eklenebilir miktar hesabı
- FIFO yeniden oynatma sırasında ürün bazlı lot havuzu ve cursor yaklaşımı
- Route bazlı code splitting
- Masaüstü / mobil ekranların ayrı lazy-load edilmesi
- Mobil okunabilirlik ve finans terminolojisi
- Modal klavye / focus erişilebilirliği
- Async işlem butonlarında çift kayıt koruması

### Veri güvenliği

- Satış oluşturma, güncelleme ve iptal işlemlerinde transaction kullanımı
- İptal edilen satışların geçmişte korunması
- Geriye dönük satış ve stok hareketlerinde kronolojik FIFO rebuild
- JSON restore sonrasında FIFO allocation verilerinin yeniden oluşturulması
- Database schema v6 ile backup / restore uyumluluğu

### Doğrulama

v0.1.0 öncesinde şu akışlar regresyon testinden geçirilmiştir:

- Ürün / kategori işlemleri
- Çok partili FIFO tüketimi
- Sepet yuvarlama
- Stok artırma / azaltma
- Geriye dönük satış
- Satış düzenleme / iptal
- Dashboard ve rapor toplamları
- Mobil / masaüstü responsive geçişleri
- JSON backup / restore
- CSV export
- IndexedDB kalıcılığı
