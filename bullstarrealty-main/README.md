# Bull Star Realty

## Project info

**App URL**: https://bullstarrealty.ae

## How can I edit this code?

There are several ways of editing your application.

This app has been migrated to your own Supabase project.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Deploy with your preferred hosting provider (for example Vercel, Netlify, or your VPS) after setting production environment variables.

## Can I connect a custom domain?

Yes. Configure DNS and your hosting provider's domain settings for your deployment target.

## Migrate from Lovable Cloud to your own Supabase

Use the migration playbook in `docs/supabase-migration.md` to move:

- Database schema and data
- Storage bucket metadata and objects
- Edge Function secrets and project config
- Frontend environment values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)

Quick command:

```sh
npm run migrate:supabase
```
