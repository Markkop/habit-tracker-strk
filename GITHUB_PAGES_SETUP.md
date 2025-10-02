# GitHub Pages Deployment Guide

This guide explains how to deploy your Scaffold-Stark 2 application to GitHub Pages.

## Prerequisites

- Your code is in a GitHub repository
- You have admin access to the repository

## Configuration Changes Made

The following changes have been made to enable GitHub Pages deployment:

1. **Next.js Configuration** (`packages/nextjs/next.config.mjs`):
   - Added `output: "export"` for static site generation
   - Added `basePath` and `assetPrefix` to handle GitHub Pages subdirectory deployment
   - Set `images.unoptimized: true` (required for static export)

2. **API Routes** (`packages/nextjs/services/web3/PriceService.ts`):
   - Updated to call CoinGecko API directly (API routes don't work with static export)

3. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
   - Automated build and deployment process

## Setup Steps

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **Source**, select **GitHub Actions**

### 2. Push Changes to GitHub

```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

### 3. Wait for Deployment

- GitHub Actions will automatically build and deploy your site
- Check the **Actions** tab in your repository to monitor progress
- Once complete, your site will be available at:
  - `https://<username>.github.io/<repository-name>/`

## Local Testing

To test the build locally before deploying:

```bash
# Build for GitHub Pages
cd packages/nextjs
yarn build

# The static files will be in the 'out' directory
# You can serve them locally with:
npx serve out
```

## Important Notes

### API Routes
- GitHub Pages only supports static sites
- All API routes have been converted to client-side API calls
- The price fetching now calls CoinGecko directly from the browser

### Images
- Image optimization is disabled (`unoptimized: true`)
- All images are served as static assets

### Base Path
- If deploying to a repository (not username.github.io), the site will be at `/<repo-name>/`
- The base path is automatically configured in the GitHub Actions workflow
- For local development without base path, just run `yarn dev` as usual

### Environment Variables
- Add any environment variables in GitHub repository settings:
  - Go to **Settings** > **Secrets and variables** > **Actions**
  - Add your variables (e.g., `NEXT_PUBLIC_SEPOLIA_PROVIDER_URL`)

## Deployment Types

### User/Organization Site (username.github.io)
If your repository is named `<username>.github.io`, the site will be at the root:
- URL: `https://<username>.github.io/`
- No base path needed - remove `NEXT_PUBLIC_BASE_PATH` from the workflow

### Project Site (other repository names)
For any other repository name:
- URL: `https://<username>.github.io/<repository-name>/`
- Base path is automatically set to `/<repository-name>/`

## Troubleshooting

### 404 Errors
- Ensure GitHub Pages is enabled in repository settings
- Check that the workflow completed successfully
- Verify the correct branch is selected for deployment

### Assets Not Loading
- Check that `basePath` and `assetPrefix` are correctly set
- Ensure `.nojekyll` file exists in the `public` folder

### Build Failures
- Check the Actions tab for detailed error logs
- Ensure all dependencies are correctly listed in `package.json`
- Verify that your code builds locally with `yarn build`

## Reverting to Vercel

If you want to switch back to Vercel deployment:

1. Remove or comment out `output: "export"` in `next.config.mjs`
2. Remove `basePath` and `assetPrefix` settings
3. Set `images.unoptimized: false`
4. You can keep the PriceService changes (direct API calls work on Vercel too)
5. Use `yarn vercel` to deploy

## Custom Domain

To use a custom domain with GitHub Pages:

1. Add a `CNAME` file in `packages/nextjs/public/` with your domain
2. Configure DNS settings with your domain provider
3. In GitHub repository settings > Pages, add your custom domain
4. Remove the `NEXT_PUBLIC_BASE_PATH` from the workflow (custom domains don't need it)

## Additional Resources

- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

