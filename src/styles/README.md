# BazaarFlow CSS mimarisi

`src/index.css` yalnızca stil katmanlarını doğru cascade sırasıyla içeri alır.

- `00-design-tokens.css`: renk, yüzey, gölge, spacing, radius, layout ve motion tokenları.
- `01-foundation.css`: reset ve global element davranışları.
- `02-shell-common.css`: sidebar, ana içerik, ortak kart/form/tablo altyapısı.
- `03-core-features.css`: ürün, stok, satış, dashboard, raporlar, stok düzeltmeleri ve ayarlar.
- `04-responsive-pos.css`: responsive kurallar, mobil nav, hızlı satış/POS.
- `05-mobile-merged-features.css`: mobil sayfalar, Ürün & Stok ve Geçmiş birleşik UI.
- `06-data-center.css`: Veri Merkezi, recovery ve yedekleme ekranları.
- `07-theme-system.css`: Light/Dark, renk temaları ve tema kombinasyon polish.
- `08-platform.css`: Windows / Android / Web platform özel polish.

## Kural

Yeni ortak ölçüler için önce `00-design-tokens.css` içindeki tokenları kullanın. Tema renklerini component içine sabit hex olarak eklemek yerine mevcut `--color-*` değişkenlerini kullanın. Platforma özel kurallar yalnızca `08-platform.css` içinde tutulmalıdır.
