# AV Map Explorer

Interactive map showing autonomous vehicle service areas across the United States. Explore Waymo, Tesla, Zoox and other AV deployments.

## Local Dev Handoff

### Prerequisites
- **Node.js 20+** - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm (comes with Node.js)

### Getting Started
```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Setup
Create a `.env.local` file in the project root:
```bash
VITE_MAPBOX_PUBLIC_TOKEN=your_mapbox_public_token_here
```

**Getting a Mapbox Token:**
1. Go to [mapbox.com](https://mapbox.com) and create an account
2. Navigate to the Tokens section in your dashboard
3. Create a new public token with domain restrictions for security
4. Restrict the token to your domains (e.g., `localhost:8080`, `yourdomain.com`)

### Project Structure

#### Key Data Files
- `public/data/news.json` - News articles database
- `public/data/taxonomy.json` - Filter categories and options
- `public/data/index.json` - Service area definitions
- `public/areas/*.geojson` - Geographic boundaries for each service area

#### Important Directories
- `src/components/` - Reusable UI components
- `src/pages/` - Route components
- `src/lib/` - Utility functions and data handling
- `public/images/` - Static assets and news images

### Admin Interface

**Accessing the Admin:**
1. Navigate to `/admin/news?admin=1` in your browser
2. Use the CSV import feature to bulk-add news articles
3. Download updated `news.json` and `taxonomy.json` files after imports
4. Replace the files in `public/data/` directory

**CSV Import Format:**
The CSV should include columns for title, url, date, topic, companies, geography, tags, and type.

### Technical Notes

#### Map Layout
- Uses `absolute inset-0` positioning for full viewport coverage
- Header height is managed via CSS custom property `--header-h`
- Map container adapts to header height changes

#### No-Scroll Behavior
- The `no-scroll` class is applied to `<body>` only on the home page (`/`)
- This prevents background scrolling when map overlays are open
- Other pages maintain normal scrolling behavior

#### Responsive Design
- Uses Tailwind CSS with custom design tokens
- Header height is dynamically calculated and synced across components
- Mobile-first approach with responsive breakpoints

### Deployment

#### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_MAPBOX_PUBLIC_TOKEN` = your production Mapbox token
3. Deploy automatically on git push

#### Netlify
1. Connect your GitHub repository to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Set environment variables in Netlify dashboard:
   - `VITE_MAPBOX_PUBLIC_TOKEN` = your production Mapbox token
4. Deploy automatically on git push

**Important:** Always use domain-restricted Mapbox tokens in production and never commit tokens to your repository.

## Project info

**URL**: https://lovable.dev/projects/0378d036-f786-4c03-8108-b3f789075957

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0378d036-f786-4c03-8108-b3f789075957) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

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

Simply open [Lovable](https://lovable.dev/projects/0378d036-f786-4c03-8108-b3f789075957) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
