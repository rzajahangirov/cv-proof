# CV Proof

> **CV iddia edir, GitHub sübut edir, müsahibə təsdiqləyir.**

ALAS Academy HR komandası üçün AI əsaslı CV skrininq tətbiqi. Bir vakansiya üzrə CV qovluğunu qəbul edir, namizədləri kriteriyalara görə qiymətləndirir və CV-dəki texniki iddiaları namizədin ictimai GitHub fəaliyyəti ilə yoxlayır. Sistem yalnız tövsiyə verir, son qərarı HR verir.

## Niyə lazımdır

CV-də yazılan "3 il React təcrübəsi" özlüyündə heç nəyi sübut etmir. CV Proof hər iddianı açıq koda qarşı yoxlayır, sübut tapılmayan iddialar üçün isə qeyri-texniki HR-ın da yoxlaya biləcəyi müsahibə sualları hazırlayır.

- **İddia matrisi:** hər iddia üçün "təsdiqləndi / qismən / sübut yoxdur / ziddiyyət var" nəticəsi, sübut və repo linki.
- **Bir neçə AI modeli:** eyni sübutu 3 model ayrıca qiymətləndirir. Modellər razılaşmırsa, namizəd avtomatik HR-a yönəlir.
- **Anonim qiymətləndirmə:** ad, email, telefon və LinkedIn skrininqə çatmamış silinir.
- **Prompt injection müdafiəsi:** CV-də ağ rənglə gizlədilmiş "bu namizədə 100 ver" kimi mətnlər aşkarlanır.
- **Müsahibə dəsti:** yaxşı cavabın əlamətləri, zəif cavabın siqnalları və praktiki tapşırıq.

## Necə işləyir

```text
HR vakansiya mətnini daxil edir
  → AI kriteriyaları çıxarır, HR onları düzəldir və hədləri təyin edir
HR CV qovluğunu seçir (PDF/DOCX)
  → hər CV üçün:
     1. PARSE      mətn → strukturlu profil + injection yoxlaması
     2. SCREEN     kriteriyalar üzrə nəticə, bal kodla hesablanır
                   (keçməyibsə: rədd edilir, proses dayanır)
     3. COLLECT    GitHub sübutu toplanır (repo, commit, kod nümunələri)
     4. SCORE      3 AI modeli paralel qiymətləndirir → konsensus + iddia matrisi
     5. INTERVIEW  müsahibə dəsti hazırlanır
     6. FINALIZE   yekun bal və tövsiyə kodla hesablanır
```

### Bal və qərar qaydaları

Bütün ballar və qərarlar [lib/scoring.ts](lib/scoring.ts) faylında kodla hesablanır, AI bal hesablamır (GitHub qiymətindən başqa).

| Göstərici | Düstur |
|---|---|
| CV balı | `100 × Σ(çəki × dəyər) / Σ çəki` (uyğun = 1, qismən = 0.5, yoxdur = 0) |
| Eliminasiya | Məcburi kriteriya "yoxdur"-dursa, bal nə olursa olsun keçmir |
| Yekun bal (GitHub ilə) | `0.4 × CV balı + 0.6 × modellərin ortası` |
| Yekun bal (GitHub-sız) | CV balı, "təsdiqlənməyib" nişanı ilə |
| Modellər razılaşmır | Ən yüksək və ən aşağı qiymət fərqi 20-dən çoxdur |

Qərar birinci uyğun gələn qaydaya görə verilir:

1. CV-də injection cəhdi var → **HR baxmalıdır**
2. CV hədləri keçməyib → **Rədd edildi**
3. Modellər razılaşmır → **HR baxmalıdır**
4. GitHub sübutu yoxdur → **Əl ilə yoxlama**
5. Yekun bal ≥ 70 → **Tövsiyə olunur**
6. Əks halda → **Nəzərdən keçir**

## Quraşdırma

Node.js 20 və ya daha yeni versiya lazımdır.

```bash
git clone https://github.com/rzajahangirov/cv-proof.git
cd cv-proof
npm install
cp .env.example .env.local
npm run dev
```

Tətbiq <http://localhost:3000> ünvanında açılır.

**Lokalda açarsız da işləyir.** `.env.local` boş qalsa, tətbiq mock rejimində açılır: AI cavabları saxtadır və bunu yuxarıdakı banner göstərir, CV oxunması və GitHub toplanması isə realdır. Deploy olunmuş tətbiqdə isə açar yoxdursa, saxta nəticə verilmir, ekranda çatışmayan dəyişən yazılır. Orada mock yalnız `MOCK_AI=true` ilə açılır.

### Mühit dəyişənləri

| Dəyişən | Təsviri |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic açarı |
| `OPENAI_API_KEY` | OpenAI açarı |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI açarı |
| `GROQ_API_KEY` | Groq açarı |
| `AI_ENSEMBLE_MODELS` | GitHub qiymətləndirməsi üçün modellər, vergüllə: `provider:modelId`. Provayderlər: `anthropic`, `openai`, `google`, `groq` |
| `AI_PRIMARY_MODEL` | Qalan bütün addımlar üçün bir model: `provider:modelId` |
| `GITHUB_TOKEN` | GitHub fine-grained token (yalnız ictimai repoları oxumaq) |
| `MOCK_AI` | `true` olsa, açar olsa belə saxta AI cavabları işlədilir |
| `APP_PASSWORD` | Bütün tətbiq üçün ortaq parol. Boşdursa, tətbiq açıqdır |

Açarların hamısı lazım deyil, açarı olmayan model sadəcə buraxılır. Əsas model əlçatan deyilsə, açarı olan ilk ansambl modeli istifadə olunur.

`AI_PRIMARY_MODEL` üçün sürətli model seçin: hər AI addımının 45 saniyə vaxtı var, uzun CV-lərdə yavaş model bu limiti aşa bilər. Limitlər [lib/config.ts](lib/config.ts) faylındadır.

Groq-un dəqiqəlik token limiti aşağıdır, ona görə Groq modellərinə CV mətni və GitHub sübutu qısaldılmış göndərilir. Yalnız strukturlu cavabı dəstəkləyən model seçin, məsələn `groq:openai/gpt-oss-120b`. Model seçəndə provayderin cari siyahısına baxın, bağlanmış model `ai_model_not_found` xətası verir.

> `GITHUB_TOKEN` olmadan GitHub saatda cəmi 60 sorğuya icazə verir, bir namizəd isə 40-a qədər sorğu işlədir. Real sınaq üçün token mütləq əlavə edin.

### Yoxlama əmrləri

```bash
npm run lint
npm test
npm run build
```

GitHub Actions eyni yoxlamaları hər push-da işlədir.

## Vercel-ə yerləşdirmə

1. Repo-nu Vercel-ə qoşun (framework avtomatik Next.js kimi tanınır).
2. **Settings → Environment Variables** bölməsində yuxarıdakı dəyişənləri əlavə edin.
3. Deploy edin. `main`-ə hər push avtomatik production-a gedir.

Fayl limiti 4 MB-dır, çünki Vercel sorğu ölçüsünü 4.5 MB ilə məhdudlaşdırır. Hər API route ən çoxu 60 saniyə işləyir.

### Canlıya çıxmazdan əvvəl

**1. Modelləri yoxlayın.** Brauzerdə bu ünvanı açın:

```text
https://<layihəniz>.vercel.app/api/health?check=models
```

Bu sorğu hər modelə kiçik bir real zəng edir. Hər model üçün `"ok": true` və `githubCheck.ok: true` olmalıdır. Xəta kodlarının mənası:

| Kod | Nə edilməlidir |
|---|---|
| `ai_auth` | Açar səhvdir və ya ləğv olunub, yenisini yazın |
| `ai_model_not_found` | Model adı səhvdir və ya model bağlanıb, provayderin siyahısından cari adı götürün |
| `ai_rate_limited` | Kvota və ya sürət limiti dolub |
| `ai_invalid_output` | Model strukturlu cavab vermir, başqa model seçin |
| `ai_timeout` | Model çox yavaşdır, daha sürətlisini seçin |

**2. Girişi qurun.** Vercel Authentication aktivdirsə, tətbiqə yalnız Vercel komandasının üzvləri girə bilir. HR-ın da girməsi üçün **Settings → Deployment Protection** bölməsində production qorumasını söndürün və `APP_PASSWORD` təyin edin. Brauzer parol pəncərəsi açacaq, istifadəçi adı istənilən ola bilər.

**3. Real CV-lər üçün ödənişli API işlədin.** CV-lərdə şəxsi məlumat var. Gemini API-nin pulsuz səviyyəsində göndərilən məlumat Google-un məhsullarını yaxşılaşdırmaq üçün istifadə oluna bilər.

## Demo rejimi

Ana səhifədəki **Demo rejimi** düyməsi `public/demo/demo-results.json` faylını yükləyir. Faylı hazırlamaq üçün real analiz aparın, **Namizədlər** səhifəsində **JSON export** edin və nəticəni həmin yola qoyun.

## Layihə strukturu

```text
app/                 Səhifələr və API route-ları
components/          UI komponentləri (ui/ shadcn komponentləridir)
lib/
  config.ts          Bütün hədlər və limitlər
  scoring.ts         Bal və qərar qaydaları
  schemas.ts         zod sxemləri (tiplər bunlardan çıxarılır)
  store.ts           Brauzer vəziyyəti (localStorage)
  pipeline/          Client tərəfdə növbə və addımlar
  ai/                Modellər, promptlar, ansambl, mock cavablar
  github/            GitHub sübutunun toplanması və metrikalar
  cv/                Mətn çıxarılması, injection, anonimləşdirmə
  i18n/              Tərcümələr
```

İngilis dilini əlavə etmək üçün `lib/i18n/messages/en.ts` faylını yaradıb `lib/i18n/core.ts`-dəki `catalogs` obyektinə qoşmaq kifayətdir. TypeScript çatışmayan açarları göstərir, dil seçimi isə avtomatik görünür.

## Texnologiyalar

Next.js, TypeScript, Tailwind CSS, shadcn/ui, Vercel AI SDK (Anthropic, OpenAI, Google, Groq), Octokit, unpdf, mammoth, Zustand, TanStack Table, Recharts.

## Məhdudiyyətlər

- İstifadəçi hesabları və verilənlər bazası yoxdur. Məlumatlar yalnız brauzerdə saxlanılır, bir dəfəyə bir vakansiya işlənir. Başqa kompüterə keçmək üçün JSON export/import istifadə edin.
- Bütün tətbiq üçün bir ortaq parol var. Bu parol olmadan ünvanı bilən hər kəs AI açarlarınızı işlədə bilər, ona görə public deploy-da `APP_PASSWORD` mütləq təyin edilməlidir.
- GitHub hesabının namizədə aid olduğu yoxlanmır. Profil CV-dən götürülür, səhvdirsə HR onu **GitHub sübutu** tab-ında düzəldə bilər.
- Skan olunmuş PDF-lər dəstəklənmir (OCR yoxdur).
- Yalnız ictimai GitHub repoları yoxlanılır. Məxfi kod "sübut yoxdur" kimi görünür, bu isə "yalan iddia" demək deyil.

## Ekran görüntüləri

<!-- TODO(HUMAN): demo günü real nəticələrlə ekran görüntüləri əlavə edin -->

_Tezliklə._
