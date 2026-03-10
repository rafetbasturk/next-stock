# Next Stock

English version: [README.md](/Users/rafet/Desktop/next-stock/README.md)

`next-stock`, müşteri, ürün, sipariş, teslimat ve stok hareketlerini tek bir arayüzden yönetmek için geliştirilmiş bir Next.js envanter ve sipariş takip uygulamasıdır.

Uygulama halka açık bir e-ticaret sistemi değil, kurum içi operasyon aracı olarak tasarlanmıştır. Odak noktası:

- müşteriye özel ürün katalogları
- sipariş girişi ve sevkiyat takibi
- teslimat ve iade kaydı
- stok hareket defteri görünürlüğü
- gösterge paneli metrikleri ve aylık raporlama
- iki dilli arayüz (`en`, `tr`)

## Ana modüller

### Gösterge paneli

Ana sayfa operasyonel özetler ve grafikler sunar:

- toplam sipariş tutarı
- teslim edilen sipariş tutarı
- açık sipariş tutarı
- aylık sipariş adedi, aylık teslimat adedi, aylık toplam sipariş tutarı ve aylık teslim edilen sipariş tutarı

Gösterge paneli filtreleri yıl ve müşteri seçimini destekler. Tutarlar, kullanıcının tercih ettiği para biriminde istemci tarafındaki kur dönüşümü ile gösterilebilir.

### Siparişler

Siparişler modülü, müşterilere bağlı satış siparişlerini yönetir.

- standart sipariş kalemleri ürünlere bağlanır
- özel sipariş kalemleri katalog dışı işleri destekler
- sipariş durumları şunlardır:
  `KAYIT`, `ÜRETİM`, `KISMEN HAZIR`, `HAZIR`, `BİTTİ`, `İPTAL`
- siparişler arama, filtreleme, sıralama, sayfalama ve düzenleme akışlarını destekler

### Sipariş Takip

Sipariş takip ekranı, ana sipariş tablosundan ayrı bir operasyon görünümüdür. Sipariş girişi ile karıştırmadan ilerleme ve kalan miktar takibi yapmak için kullanılır.

### Ürünler

Ürünler modülü, müşteriye bağlı ürünleri ve teknik detaylarını saklar:

- ürün kodu ve adı
- birim, fiyat ve para birimi
- stok miktarı ve minimum stok seviyesi
- alternatif kodlar
- malzeme, kaplama, son işlem, ölçü ve notlar

Ürünler oluşturulabilir, düzenlenebilir ve stok düzeltmesi yapılabilir.

### Stok hareketleri

Stoğu etkileyen her işlem stok hareket defterinde tutulur. Hareket tipleri:

- `IN`
- `OUT`
- `DELIVERY`
- `RETURN`
- `ADJUSTMENT`
- `INITIAL`
- `TRANSFER`

Hareket kayıtları, oluşmalarına neden olan kaynak kayda bağlanabilir. Örneğin teslimat veya manuel stok düzeltmesi.

### Teslimatlar

Teslimatlar siparişlerden ayrı kaydedilir ve iki türden biri olabilir:

- `DELIVERY`
- `RETURN`

Teslimat kalemleri ya standart bir sipariş kalemine ya da özel sipariş kalemine bağlanır. Teslimat veya iade kaydı oluşturulduğunda stok hareketi de yazılır; böylece fiziksel stok ile hareket defteri uyumlu kalır.

### Müşteriler

Müşteriler birinci sınıf kayıtlardır ve şu alanları kapsar:

- ürünler
- siparişler
- teslimatlar
- gösterge paneli filtreleri

### Bakım

Bakım ekranı sadece admin kullanıcılara açıktır. Burada stok bütünlüğü raporu sunulur ve şu iki değer karşılaştırılır:

- ürün kaydındaki raf stoğu
- stok hareketlerinden hesaplanan hareket defteri stoğu

Admin kullanıcılar uyuşmazlıkları, ürün stokunu hareket defteriyle eşitleyerek düzeltebilir.

## Temel iş akışı

Uygulama doğrudan bir operasyon akışı modeller:

1. Müşterileri oluştur.
2. Bu müşterilere bağlı ürünleri oluştur.
3. Ürün kalemleri veya özel kalemlerle sipariş oluştur.
4. Sipariş takip ekranından ilerlemeyi izle.
5. Teslimat veya iade kaydı gir.
6. Stok hareketlerini ve stok bütünlüğü uyuşmazlıklarını kontrol et.

## Veri modeli

Temel tablolar [db/schema.ts](/Users/rafet/Desktop/next-stock/db/schema.ts) içinde tanımlıdır:

- `customers`
- `products`
- `orders`
- `order_items`
- `custom_order_items`
- `deliveries`
- `delivery_items`
- `stock_movements`
- `users`
- `sessions`
- `login_attempts`
- `rate_limits`

Önemli ilişkiler:

- bir müşteri, birden fazla ürün, sipariş ve teslimata sahip olabilir
- bir sipariş, standart kalemler ve isteğe bağlı özel kalemler içerebilir
- bir teslimat kalemi tam olarak tek bir sipariş kalemi kaynağına bağlanır
- stok hareketleri bir ürüne ve kaydı oluşturan kullanıcıya aittir

## Kimlik doğrulama ve yetki

Kimlik doğrulama oturum tabanlıdır ve PostgreSQL üzerinde tutulur.

- kullanıcılar kullanıcı adı ve şifre ile giriş yapar
- şifreler `bcryptjs` ile doğrulanır
- oturumlar `sessions` tablosunda tutulur ve HTTP-only cookie ile saklanır
- giriş koruması global rate limit ve kullanıcı/IP bazlı deneme takibi içerir
- admin yetkisi şu anda bakım işlevlerini sınırlar

İlgili dosyalar:

- [app/actions/auth.ts](/Users/rafet/Desktop/next-stock/app/actions/auth.ts)
- [lib/auth/index.ts](/Users/rafet/Desktop/next-stock/lib/auth/index.ts)
- [lib/auth/roles.ts](/Users/rafet/Desktop/next-stock/lib/auth/roles.ts)

## Yerelleştirme ve kullanıcı ayarları

Uygulama İngilizce ve Türkçe destekler.

- diller: `en`, `tr`
- varsayılan dil: `en`
- dil, cookie veya `Accept-Language` üzerinden belirlenir
- saat dilimi istekten algılanır ve cookie içine yazılır
- tema seçenekleri: `light`, `dark`, `system`

## Teknoloji yığını

- Next.js App Router
- React 19
- TypeScript
- PostgreSQL
- Drizzle ORM + Drizzle Kit
- TanStack Query
- TanStack Table
- next-intl
- Zustand
- Tailwind CSS v4
- Recharts
- shadcn/ui tarzında bileşenler

## Proje yapısı

```text
app/          Route'lar, layout'lar, server action'lar, API handler'lar
components/   Özellik bazlı UI ve tekrar kullanılan tablo/form primitifleri
db/           Drizzle schema ve veritabanı export'ları
drizzle/      SQL migration dosyaları
hooks/        Ortak React hook'ları
lib/          Query'ler, server servisleri, auth, arama parametreleri, yardımcı kodlar, i18n
stores/       Kur gibi istemci durumu
```

## Lokal geliştirme

### Gereksinimler

- Node.js
- pnpm
- PostgreSQL

### Ortam değişkeni

`.env` dosyasına şunu ekleyin:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
```

### Kurulum ve çalıştırma

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

## Script'ler

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Datetime QA kontrol listesi

Saat dilimi ve tarih filtreleme davranışı şu varsayımları izlemelidir:

- tüm timestamp alanları `timestamptz` olarak saklanır
- `startDate` ve `endDate` filtreleri, kullanıcının çözülmüş saat dilimindeki yerel takvim günlerini temsil eder
- tarih aralığı sorguları `>= startOfDayUtc` ve `< nextDayStartUtc` semantiğini kullanır

Referans senaryolar:

1. `Europe/Istanbul`, filtre `2026-03-01..2026-03-01`
   Dahil edilen UTC aralığı: `2026-02-28T21:00:00.000Z` ile `<2026-03-01T21:00:00.000Z`
2. `America/New_York`, yaz saati geçişi günü `2026-03-08`
   Dahil edilen UTC aralığı: `2026-03-08T05:00:00.000Z` ile `<2026-03-09T04:00:00.000Z`
3. Ay sınırı bucket davranışı
   `2026-03-31T22:30:00.000Z`, `Europe/Istanbul` için `2026-04`, `America/New_York` için `2026-03` olarak değerlendirilir

Manuel QA kontrolleri:

- sipariş sayfasındaki tarih filtreleri, çözülmüş saat dilimindeki yerel gün beklentileri ile uyuşmalıdır
- yalnızca görüntülenen saat dilimi değiştiğinde, sınırlar etkilenmiyorsa dashboard toplamları sabit kalmalıdır
- aylık genel bakış bucket'ları UTC ay sınırlarına değil yerel ay sınırlarına göre değişmelidir
- ürün yaşam döngüsü ve stok hareket timestamp'leri çözülmüş saat diliminde gösterilmelidir
- geçersiz saat dilimi cookie değerleri sorunsuz biçimde UTC davranışına geri dönmelidir

## Operatör ve geliştirici notları

- Uygulama, kullanıcıların veritabanında zaten mevcut olduğunu varsayar; repository içinde seed veya signup akışı yoktur.
- `report` route'u `maintenance` sayfasına yönlendirir.
