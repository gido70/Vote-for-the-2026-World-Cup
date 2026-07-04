# توقعات كأس العالم 2026 - نسخة Supabase + GitHub Pages

## 1) إنشاء قاعدة البيانات
افتح Supabase > SQL Editor ثم انسخ محتوى ملف:

`database.sql`

وشغّله مرة واحدة.

## 2) وضع مفاتيح Supabase
افتح ملف:

`config.js`

واستبدل:

```js
url: "PUT_SUPABASE_PROJECT_URL_HERE",
anonKey: "PUT_SUPABASE_ANON_PUBLIC_KEY_HERE",
```

من:
Supabase Dashboard > Project Settings > API

استخدم:
- Project URL
- anon public key

## 3) رفع GitHub
ارفع الملفات كلها إلى المستودع:

- index.html
- config.js
- database.sql
- manifest.webmanifest
- sw.js
- icon.svg
- README.md

ثم فعّل GitHub Pages.

## 4) التشغيل على الموبايل كتطبيق
افتح الرابط من Safari أو Chrome ثم:
- iPhone: Share > Add to Home Screen
- Android: Add to Home screen

سيظهر كتطبيق مستقل.

## 5) لوحة المشرف
رمز المشرف الافتراضي:

`QX742`

يمكن تغييره من ملف `config.js`.

## ملاحظات مهمة
- هذه النسخة تحفظ البيانات في Supabase وليس في Claude.
- تمنع تكرار الاسم عبر كل الأجهزة لأن الاسم يخزن في قاعدة البيانات.
- لوحة الترتيب مشتركة للجميع.
- شعار البطولة يرفع من لوحة المشرف ويظهر كخلفية مائية.
