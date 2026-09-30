# BazaarFlow

**BazaarFlow**, pazar ve küçük ölçekli satış işletmeleri için geliştirilen; ürün, stok, satış, maliyet, raporlama ve yedekleme işlemlerini tek uygulamada yönetmeyi amaçlayan **local-first** bir satış ve stok takip uygulamasıdır.

Uygulama Windows, Android ve Web/PWA hedefleri için geliştirilmektedir. Temel yaklaşım; internet olmasa bile uygulamanın çalışmaya devam etmesi, verilerin öncelikle cihazda güvenli şekilde tutulması ve cihazlar arası senkronizasyonun isteğe bağlı olmasıdır.

> Güncel uygulama sürümü: **0.1.0**  
> Geliştirme durumu: **Aktif geliştirme / v1.0.0 hazırlığı**

---

## İçindekiler

- [Öne Çıkan Özellikler](#öne-çıkan-özellikler)
- [Platformlar](#platformlar)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Kurulum](#kurulum)
- [Geliştirme Komutları](#geliştirme-komutları)
- [Ürün ve Stok Yönetimi](#ürün-ve-stok-yönetimi)
- [Satış Sistemi](#satış-sistemi)
- [FIFO Maliyet Yaklaşımı](#fifo-maliyet-yaklaşımı)
- [Geçmiş ve Raporlama](#geçmiş-ve-raporlama)
- [Veri Merkezi ve Yedekleme](#veri-merkezi-ve-yedekleme)
- [Tema ve Arayüz Sistemi](#tema-ve-arayüz-sistemi)
- [Platforma Özel Arayüz](#platforma-özel-arayüz)
- [Mobil Ekran Modeli](#mobil-ekran-modeli)
- [Web ve PWA](#web-ve-pwa)
- [Senkronizasyon](#senkronizasyon)
- [Veri Güvenliği Yaklaşımı](#veri-güvenliği-yaklaşımı)
- [Proje Yapısı](#proje-yapısı)
- [Build Alma](#build-alma)
- [Yol Haritası](#yol-haritası)
- [Git Akışı](#git-akışı)
- [Geliştirme Prensipleri](#geliştirme-prensipleri)
- [Gelecek Planları](#gelecek-planları)
- [Lisans](#lisans)

---

# Öne Çıkan Özellikler

BazaarFlow'un mevcut sürümünde aşağıdaki ana özellikler bulunmaktadır:

- Ürün ekleme, düzenleme ve pasife alma
- Kategori yönetimi
- Güvenli ürün ve kategori silme sistemi
- Ürün ve stok ekranlarının birleşik yönetimi
- Stok ekleme ve stok hareketlerini takip etme
- FIFO tabanlı maliyet yaklaşımı
- Hızlı satış
- Toplu satış
- Satış geçmişi
- Mobilde günlük gruplanmış satış geçmişi
- Satış detaylarını görüntüleme
- Satış düzenleme ve iptal işlemleri
- Raporlama ekranları
- Otomatik kurtarma noktaları
- Manuel yedek oluşturma
- Yedek içe aktarma
- Yedekten geri yükleme
- CSV dışa aktarma
- Light / Dark / System tema sistemi
- 7 farklı vurgu rengi
- Windows, Android ve Web için platforma özel arayüz davranışları
- Mobilde sabit ekran + kaydırılabilir içerik modeli
- Web/PWA desteği
- Offline çalışma
- Cihazlar arası senkronizasyon için temel altyapı

---

# Platformlar

| Platform | Durum |
|---|---|
| Windows | Aktif |
| Android | Aktif |
| Web | Aktif |
| PWA | Aktif |
| iOS | Şimdilik hedeflenmiyor |

Windows ve Android sürümleri **Tauri** üzerinden hazırlanır. Web sürümü doğrudan Vite build çıktısını kullanır.

---

# Teknoloji Yığını

## Frontend

- React
- TypeScript
- Vite
- React Router
- Lucide Icons

## Masaüstü ve Mobil

- Tauri
- Rust
- Android WebView
- Windows WebView2

## Yerel Veri Katmanı

- Dexie
- IndexedDB

BazaarFlow'un ana veri modeli **local-first** çalışır. Normal kullanım sırasında satış, ürün ve stok işlemleri önce cihazdaki yerel veritabanına yazılır.

## Bulut / Senkronizasyon

- Supabase
- PostgreSQL
- Supabase Edge Functions

Senkronizasyon altyapısı v1.0.0 hazırlıkları kapsamında geliştirilmektedir.

---

# Kurulum

## Gereksinimler

Windows geliştirme ortamı için:

- Node.js
- npm
- Rust
- Tauri CLI bağımlılıkları
- WebView2
- Git

Android geliştirme için ek olarak:

- Android Studio
- Android SDK
- Android SDK Platform 36
- Android Emulator veya fiziksel Android cihazı

Projede kullanılan Android yapılandırması:

```text
compileSdk: 36
targetSdk: 36
minSdk: 24
```

## Projeyi Klonlama

```powershell
git clone https://github.com/zahidkaya1/BazaarFlow.git
cd BazaarFlow
npm install
```

---

# Geliştirme Komutları

## Web geliştirme

```powershell
npm run dev
```

## Production Web build

```powershell
npm run build
```

## Production Web/PWA testi

```powershell
npm run build
npm run preview
```

## Windows Tauri geliştirme

```powershell
npm run tauri -- dev
```

## Android Tauri geliştirme

```powershell
npm run tauri -- android dev
```

## Lint

```powershell
npm run lint
```

Kod değişikliklerinden sonra en az şu iki komut çalıştırılmalıdır:

```powershell
npm run lint
npm run build
```

---

# Ürün ve Stok Yönetimi

BazaarFlow'da ürün ve stok yönetimi aynı merkezden yapılır.

Desteklenen işlemler:

- Yeni ürün ekleme
- Ürün bilgilerini düzenleme
- Kategori atama
- Satış fiyatı belirleme
- Stok ekleme
- Mevcut stok miktarını görüntüleme
- Düşük stok durumunu takip etme
- Tükenen ürünleri görüntüleme
- Pasif ürünleri filtreleme
- Ürün detaylarına ulaşma
- Ürünleri güvenli şekilde silme

Mobil görünümde ürün listesi küçük ekranda fazla alan tüketmemesi için kendi içinde kaydırılabilir şekilde tasarlanmıştır.

Filtre seçenekleri:

```text
Tümü
Düşük
Tükendi
Pasif
```

---

# Satış Sistemi

BazaarFlow satış tarafında iki farklı kullanım modeli sunar.

## Hızlı Satış

Tekil ve hızlı satış işlemleri için kullanılır.

Mobil sürümde ekran:

- sabit üst alan,
- satış içeriği,
- sabit alt navigasyon

şeklinde tasarlanmıştır.

## Toplu Satış

Birden fazla ürünün aynı satış işlemi içerisinde satılmasını sağlar.

## Satış sonrasında

Satış tamamlandığında sistem:

- stok miktarını günceller,
- satış kaydını oluşturur,
- ilgili maliyet hareketlerini işler,
- rapor verilerini günceller.

---

# FIFO Maliyet Yaklaşımı

BazaarFlow stok maliyetlerinde **FIFO — First In, First Out** yaklaşımını temel alır.

Örnek:

```text
10 adet × 60 TL
10 adet × 80 TL
```

5 adet ürün satıldığında maliyet hesabı önce ilk 60 TL'lik stok partisinden yapılır.

FIFO altyapısı özellikle gelecekteki cihazlar arası senkronizasyon sisteminde veri bütünlüğünü korumak için kritik bir bileşendir.

---

# Geçmiş ve Raporlama

## Satış Geçmişi

Mobil satış geçmişi yoğun satış günlerinde ekranın yüzlerce kartla dolmasını önlemek amacıyla **gün bazında gruplanır**.

Örnek:

```text
Bugün
50 satış • 87 adet
₺4.820
```

Gün kartına girildiğinde yalnızca o güne ait satışlar gösterilir.

Desteklenen tarih filtreleri:

```text
Bugün
7 Gün
30 Gün
Tümü
```

## Raporlar

Raporlama ekranında satış ve işletme performansına ilişkin özet bilgiler görüntülenir.

Mobil görünümde dönem seçici sabit kalırken rapor içeriği kendi alanında kaydırılır.

---

# Veri Merkezi ve Yedekleme

BazaarFlow'da veri güvenliği ayrı bir **Veriler** merkezi üzerinden yönetilir.

## Otomatik Kurtarma

Sistem belirli aralıklarla kurtarma noktaları oluşturabilir.

Temel yaklaşım:

- yaklaşık 10 dakikalık periyotlarla kontrol,
- veri değişmemişse gereksiz kayıt oluşturmama,
- riskli işlemlerden önce kurtarma noktası oluşturma,
- geri yükleme öncesinde ayrıca kurtarma noktası alma.

## Manuel kayıt

Kullanıcı istediği zaman:

```text
Şimdi Kaydet
```

işlemi ile yeni bir kayıt oluşturabilir.

## Yedekler

Yedekler ekranında:

- yeni yedek oluşturma,
- dışarıdan yedek ekleme,
- mevcut yedekleri görüntüleme,
- geri yükleme,
- dışa aktarma,
- silme

işlemleri yapılabilir.

İçe aktarılan dosyalar sistem içerisinde normal bir BazaarFlow yedeği gibi yönetilir.

## Windows yedek konumu

Windows sürümünde kalıcı yedekler kullanıcı Belgeler klasörü altında saklanabilir:

```text
Documents\BazaarFlow\Yedekler
```

Mobil ve Web sürümlerinde platforma uygun yerel depolama kullanılır.

## CSV

CSV dışa aktarma özelliği desteklenir ancak ana veri koruma yöntemi BazaarFlow yedek sistemidir.

---

# Tema ve Arayüz Sistemi

BazaarFlow hem görünüm modu hem de vurgu rengi seçimini destekler.

## Görünüm modları

- Sistem
- Açık
- Koyu

`Sistem` seçildiğinde uygulama işletim sisteminin tema tercihini takip eder.

## Renk temaları

Mevcut vurgu renkleri:

- BazaarFlow
- Mavi
- Lacivert
- Mor
- Pembe
- Turuncu
- Grafit

Renk seçimi şu alanlara uygulanır:

- butonlar,
- aktif menüler,
- seçim durumları,
- focus halkaları,
- grafikler,
- marka vurguları.

Tema seçimi cihazda kalıcı olarak saklanır.

---

# Platforma Özel Arayüz

BazaarFlow aynı React kod tabanını kullanmasına rağmen platform davranışlarını ayrı ele alır.

Uygulama çalışma ortamını şu sınıflara ayırır:

```text
Windows
Android
Web
```

Arayüz modu ayrıca:

```text
Desktop
Mobile
```

olarak ayrılır.

Bu sayede Windows'ta daha kompakt masaüstü görünümü; Android'de daha büyük dokunma alanları, bottom navigation, safe-area desteği ve mobil sheet/drawer davranışları uygulanabilir.

---

# Mobil Ekran Modeli

Mobil ekranlarda temel yaklaşım:

> Ekran kabuğu sabit kalır, yalnızca anlamlı içerik alanı kaydırılır.

## Ürünler & Stok

- sayfa başlığı sabit,
- aksiyonlar sabit,
- arama sabit,
- filtreler sabit,
- ürün listesi kaydırılabilir.

## Geçmiş

- başlık sabit,
- sekmeler sabit,
- tarih filtresi sabit,
- satış listesi kaydırılabilir.

## Raporlar

- başlık sabit,
- dönem seçici sabit,
- rapor içeriği kaydırılabilir.

Bu yaklaşım Hızlı Satış ekranındaki sabit POS deneyimi ile tutarlıdır.

---

# Web ve PWA

BazaarFlow Web sürümü PWA kullanımına göre optimize edilmiştir.

Mevcut özellikler:

- PWA manifest
- 192×192 ve 512×512 uygulama ikonları
- production service worker
- offline cache
- runtime cache
- browser focus davranışları
- responsive tablet görünümü
- çevrimdışı durum göstergesi
- PWA kısayolları

Kısayollar:

- Hızlı Satış
- Ürünler & Stok
- Raporlar

Service Worker yalnızca Web/PWA ortamında aktiftir. Tauri Windows ve Android uygulamalarında kullanılmaz.

---

# Senkronizasyon

> Bu özellik şu anda geliştirme aşamasındadır.

BazaarFlow'un temel kullanımında hesap zorunluluğu yoktur.

Amaç:

```text
Hesapsız kullanım
└─ Veriler yalnızca mevcut cihazda

Cihaz eşleştirme
└─ Windows + Android + Web aynı veri alanını kullanabilir
```

## Hesap yerine cihaz eşleştirme

v1.0 için klasik e-posta/şifre hesap sistemi yerine basit cihaz eşleştirme modeli planlanmıştır.

İlk cihaz:

```text
Senkronizasyonu Başlat
```

ile ortak veri alanı oluşturur.

Yeni cihaz:

```text
BF-XXXX-XXXX
```

formatındaki süreli eşleştirme kodu ile bağlanabilir.

## Local-first sync yaklaşımı

Tam senkronizasyon tamamlandığında veri akışı şu mantıkla çalışacaktır:

```text
Kullanıcı işlemi
      ↓
Yerel Dexie veritabanı
      ↓
Sync Outbox
      ↓
Bulut
      ↓
Diğer cihazlar
```

İnternet yokken kullanıcı çalışmaya devam eder. Bekleyen değişiklikler internet geldiğinde gönderilir.

## Incremental Sync

Amaç her açılışta tüm veritabanını indirmek değildir.

Her cihaz bir senkronizasyon işaretçisi tutacaktır:

```text
lastSyncCursor
```

Sunucudan yalnızca bu işaretçiden sonraki değişiklikler alınacaktır.

## Çakışma yaklaşımı

Planlanan temel kurallar:

| İşlem | Yaklaşım |
|---|---|
| Yeni satış | Birleştir |
| Yeni stok girişi | Birleştir |
| Yeni ürün | Birleştir |
| Ürün düzenleme | Sürüm kontrolü |
| Satış düzenleme | Sürüm kontrolü |
| Satış iptali | Olay olarak işle |
| Kalıcı silme | Tombstone |
| FIFO | Yeniden hesaplama |

## Mevcut senkronizasyon durumu

Tamamlanan altyapı:

- cihaz kimliği,
- Sync Space / ortak veri alanı modeli,
- eşleştirme kodu altyapısı,
- sync state,
- outbox altyapısı,
- entity version altyapısı,
- conflict kayıt altyapısı,
- Supabase `bf_sync_*` tabloları,
- `bazaarflow-sync` Edge Function,
- Windows / Android / Web platform algılama.

Henüz tamamlanmayan bölüm:

- ürün verilerinin gerçek cihazlar arası taşınması,
- kategori senkronizasyonu,
- stok senkronizasyonu,
- satış senkronizasyonu,
- FIFO-safe yeniden hesaplama,
- kapsamlı conflict çözümü.

---

# Veri Güvenliği Yaklaşımı

BazaarFlow için temel güvenlik hedefleri:

- Kullanıcı verisinin öncelikle yerelde tutulması
- İnternet kesilmesinde veri kaybı yaşanmaması
- Yedeklerin uygulamanın ana veri modelinden bağımsız şekilde geri yüklenebilmesi
- Silme işlemlerinde referans bütünlüğünün korunması
- Sync tarafında doğrudan public tablo erişiminden kaçınılması
- Cihazların süreli eşleştirme kodlarıyla bağlanması
- Teknik sunucu kimliklerinin kullanıcı arayüzünde gösterilmemesi

Senkronizasyon için kullanılan backend tabloları uygulama içerisinde `bf_sync_*` isim alanı altında izole edilmiştir.

---

# Proje Yapısı

Ana yapı genel olarak şu şekildedir:

```text
BazaarFlow/
├─ public/
│  ├─ PWA dosyaları
│  └─ service worker
│
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ services/
│  ├─ styles/
│  │  ├─ 00-design-tokens.css
│  │  ├─ 01-foundation.css
│  │  ├─ 02-shell-common.css
│  │  ├─ 03-core-features.css
│  │  ├─ 04-responsive-pos.css
│  │  ├─ 05-mobile-merged-features.css
│  │  ├─ 06-data-center.css
│  │  ├─ 07-theme-system.css
│  │  ├─ 08-platform.css
│  │  ├─ 09-web.css
│  │  └─ 10-mobile-screen.css
│  └─ ...
│
├─ src-tauri/
├─ package.json
└─ README.md
```

> Dosya yapısı geliştirme sırasında değişebilir.

---

# Build Alma

## Windows

Geliştirme:

```powershell
npm run tauri -- dev
```

Production build:

```powershell
npm run tauri -- build
```

Windows dağıtımında ana hedef **NSIS `.exe` installer**dır.

Örnek çıktı:

```text
BazaarFlow_0.1.0_x64-setup.exe
```

MSI v1.0 için zorunlu değildir.

## Android

Geliştirme:

```powershell
npm run tauri -- android dev
```

ADB kontrolü:

```powershell
adb devices
```

Beklenen örnek:

```text
emulator-5554    device
```

## Web / PWA

```powershell
npm run build
npm run preview
```

Production çıktısı:

```text
dist/
```

klasöründe oluşur.

---

# Yol Haritası

## Tamamlanan ana aşamalar

- [x] Güvenli ürün ve kategori silme
- [x] Ürün + stok ekranlarının birleştirilmesi
- [x] Windows ürün ve stok arayüzü
- [x] Mobil ürün ve stok arayüzü
- [x] Mobil geçmiş ekranı
- [x] Android safe-area düzenlemeleri
- [x] Mobil zoom ve scroll düzenlemeleri
- [x] Mobil genel UI polish
- [x] Mobil hızlı satış polish
- [x] İkon ve hizalama düzenlemeleri
- [x] BazaarFlow marka ve ikon entegrasyonu
- [x] Veri merkezi
- [x] Otomatik kurtarma
- [x] Yedekleme
- [x] CSV sistemi
- [x] Windows NSIS installer
- [x] Light / Dark / System tema
- [x] Renk temaları
- [x] Tema kombinasyon polish
- [x] Platforma özel Windows / Mobil UI
- [x] CSS design token refactor
- [x] Web/PWA polish
- [x] Mobil sabit ekran / scroll modeli
- [x] Mobil ürün kartı scroll düzeni
- [x] Mobil satış geçmişi günlük gruplama
- [x] Senkronizasyon temel veri modeli
- [x] Cihaz eşleştirme altyapısı
- [x] Supabase sync backend temeli

## Devam eden

- [ ] Windows ↔ Android ↔ Web gerçek veri senkronizasyonu
- [ ] Incremental push / pull
- [ ] Ürün ve kategori sync
- [ ] Stok sync
- [ ] Satış sync
- [ ] FIFO-safe conflict çözümü
- [ ] Sync durum UI polish
- [ ] Cross-device testler

## v1.0 öncesi

- [ ] Genel regression test
- [ ] Hata düzeltmeleri
- [ ] Performans kontrolü
- [ ] Release build
- [ ] CHANGELOG
- [ ] GitHub Release
- [ ] v1.0.0

---

# Git Akışı

Ana branch:

```text
main
```

Durum kontrolü:

```powershell
git status
```

Standart commit akışı:

```powershell
git add .
git commit -m "Değişiklik açıklaması"
git push origin main
```

Kod göndermeden önce önerilen kontrol:

```powershell
npm run lint
npm run build
git status
```

---

# Geliştirme Prensipleri

1. **Local-first**  
   İnternet uygulamanın temel çalışması için zorunlu olmamalıdır.

2. **Basit kullanıcı deneyimi**  
   Teknik karmaşıklık kullanıcı arayüzüne yansıtılmamalıdır.

3. **Veri güvenliği**  
   Riskli işlemler mümkün olduğunca geri alınabilir olmalıdır.

4. **Platform tutarlılığı**  
   Windows, Android ve Web aynı ürünü hissettirmelidir.

5. **Mobil kullanılabilirlik**  
   Küçük ekranda gereksiz metin ve alan tüketiminden kaçınılmalıdır.

6. **Ölçeklenebilir mimari**  
   v1.0 için basit tutulan sistemler daha sonra hesap, çoklu kullanıcı ve çoklu işletme yapısına genişleyebilmelidir.

---

# Gelecek Planları

v1.0 sonrasında değerlendirilebilecek özellikler:

- kapsamlı kullanıcı hesabı sistemi,
- e-posta / şifre ile giriş,
- Google ile giriş,
- birden fazla işletme,
- personel hesapları,
- rol ve yetki sistemi,
- gelişmiş cihaz yönetimi,
- cihaz kaldırma,
- daha fazla tema,
- gelişmiş raporlar,
- dışa aktarma seçenekleri,
- ek platform desteği.

---

# Depo

GitHub:

```text
https://github.com/zahidkaya1/BazaarFlow
```

---

# Lisans

Bu proje için nihai lisans modeli henüz belirlenmemiştir.

Lisans dosyası eklenene kadar kaynak kodun kullanım, dağıtım ve yeniden yayınlama koşulları ayrıca değerlendirilmelidir.

---

## BazaarFlow

**Satış & Stok Takibi**

Local-first, sade ve çok platformlu pazar yönetimi.
