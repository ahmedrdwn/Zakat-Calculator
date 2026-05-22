# حاسبة الزكاة — Zakat Calculator

حاسبة زكاة سنوية بالجنيه المصري: نقد، ذهب، فضة، أسهم، صناديق، خصوم، وتوزيع المصارف الثمانية.

## Features

- **حساب الزكاة**: نقد وأرصدة، ذهب (عيارات متعددة)، فضة، أسهم (تداول/استثمار)، صناديق، وخصوم قابلة للخصم
- **توزيع المصارف**: دفتر أستاذ للمصارف الثمانية (الفقراء، المساكين، العاملين عليها، إلخ) مع إضافة/تعديل/حذف صرف
- **تقرير الزكاة**: تقرير عربي كامل قابل للطباعة وحفظه PDF — يشمل ملخص النصاب والحول، تفصيل الأصول بنداً بنداً، الزكاة المستحقة، وسجل توزيع المصارف، مع اسم دافع الزكاة ورقم مرجع وتاريخ
- **تصدير Excel**: ثلاث أوراق — حساب الزكاة، سجل التوزيع، وملخص المصارف

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python -m http.server 8080
```

## Deploy to GitHub

Use a **new** repo only for this app (recommended: create the repo inside this folder so only V4 files are tracked).

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `zakat-calculator`). Do **not** add a README or .gitignore there.
2. In **this folder** (Zakat Calculator/V4), run:

```powershell
cd "c:\Users\ahmed\OneDrive - Mansoura University - Main\APPS\Zakat Calculator\V4"
git init
git add index.html zakat-calculator.html README.md .gitignore
git commit -m "Zakat Calculator app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zakat-calculator.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (with GitHub).
2. **Import Git Repository**: New Project → Import the `zakat-calculator` repo.
3. **Configure**:  
   - Framework Preset: **Other**  
   - Build Command: leave empty  
   - Output Directory: leave empty or `.`  
   - Root Directory: `.`
4. Deploy. Vercel will serve `index.html` at the root.

**Or with Vercel CLI:**

```bash
npm i -g vercel
cd "Zakat Calculator/V4"
vercel
```

Follow the prompts and deploy. Your app will be live at a `*.vercel.app` URL.

## Files

| File | Purpose |
|------|--------|
| `index.html` | Main app (same as zakat-calculator.html); use this as entry for Vercel |
| `zakat-calculator.html` | Same app (backup name) |

## License

Use freely. For religious accuracy, consult a qualified Islamic scholar.
