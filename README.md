# Agroverse Shop - Static Site

This is a static HTML version of the Agroverse website, migrated from Wix to be hosted on GitHub Pages.

## Setup for GitHub Pages

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Static HTML version of Agroverse site"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository settings on GitHub
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

3. **Your site will be available at:**
   - `https://<your-username>.github.io/<repository-name>/`
   - Or if using a custom domain: `https://www.agroverse.shop`

## File Structure

```
agroverse_shop/
├── index.html          # Main landing page
├── assets/
│   └── raw/            # Original downloaded assets from Wix
│       └── Agroverse _ Regenerating our Amazon rainforest, One Cacao at a time_files/
│           ├── cacao_circles.jpg
│           ├── oscar_1.jpeg
│           ├── 20230711 - Agroverse logo for trademark filing.jpeg
│           └── ... (other images)
└── README.md
```

## Features

- ✅ Clean, modern static HTML
- ✅ Fully responsive design
- ✅ SEO optimized with meta tags
- ✅ Semantic HTML structure
- ✅ Fast loading (no heavy JavaScript frameworks)
- ✅ Mobile-friendly
- ✅ Accessible navigation

## Customization

To customize the site:

1. **Edit content:** Open `index.html` and modify the text in the HTML sections
2. **Change colors:** Edit the CSS variables in the `:root` section
3. **Add pages:** Create additional HTML files and link to them in the navigation
4. **Update images:** Replace images in the `assets/raw/...` folder and update paths in HTML

## Cost Savings

This static site eliminates the $36/month Wix hosting fee. GitHub Pages is free for public repositories!

## Notes

- All images are stored locally in the `assets/raw/` folder
- The site uses Google Fonts (Playfair Display and Open Sans)
- No external dependencies required
- Works offline once loaded

