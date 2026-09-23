# timlongg.github.io

Personal site built with **Hugo + [PaperMod](https://github.com/adityatelange/hugo-PaperMod)** — notes, CV, and site search.

Live: <https://timlongg.github.io/>

## Develop

```bash
git clone --recurse-submodules git@github.com:TIMLONGG/timlongg.github.io.git
brew install hugo        # extended
hugo server -D           # preview at http://localhost:1313
hugo --gc --minify       # build to public/
```

## Layout

- `content/post/<slug>/index.md` — notes (Markdown; images live in the same folder)
- `content/page/` — about / cv / archives
- `data/cv.yaml` — CV data (single source of truth)
- `config/_default/` — site config
- `layouts/`, `assets/css/extended/custom.css` — template overrides and custom styles
- `scripts/new-post.sh` — create a new note

Pushing to `main` builds and deploys via GitHub Actions; set Pages source to **GitHub Actions** once.
