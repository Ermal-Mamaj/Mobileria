// One-off script: fills in placeholder photos ONLY where a category or
// content record currently has no photo set — never overwrites a real
// uploaded photo. Meant purely for showing the client a fully-populated
// site before real Bella Casa photography is ready.
//
// Every photo here is from Unsplash under the Unsplash License, which is
// free for commercial use with NO attribution required - so nothing
// further is needed once real photos replace these (no credits page,
// no license obligation left behind).
//
// Run once:  cd server && node --env-file=.env populate-demo-photos.mjs

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const PHOTOS = {
  home: 'https://images.unsplash.com/photo-1755288556391-c4911fa13627?fm=jpg&q=80&w=2000&auto=format&fit=crop',
  about: 'https://images.unsplash.com/photo-1779031242515-205111711b23?fm=jpg&q=80&w=2000&auto=format&fit=crop',
  categories: {
    'living-room': 'https://images.unsplash.com/photo-1755288556391-c4911fa13627?fm=jpg&q=80&w=1600&auto=format&fit=crop',
    'bedroom': 'https://images.unsplash.com/photo-1752407828561-2450ced77979?fm=jpg&q=80&w=1600&auto=format&fit=crop',
    'kitchen': 'https://images.unsplash.com/photo-1764526624453-db32c24eca55?fm=jpg&q=80&w=1600&auto=format&fit=crop',
    'dining-room': 'https://images.unsplash.com/photo-1696266530393-aa1871124c3f?fm=jpg&q=80&w=1600&auto=format&fit=crop',
  },
};

async function run() {
  let updated = 0;

  const [home] = await sql`SELECT hero_image_url FROM home_content WHERE id = 1`;
  if (home && !home.hero_image_url) {
    await sql`UPDATE home_content SET hero_image_url = ${PHOTOS.home} WHERE id = 1`;
    console.log('Set home page hero image');
    updated++;
  }

  const [about] = await sql`SELECT hero_image_url FROM about_content WHERE id = 1`;
  if (about && !about.hero_image_url) {
    await sql`UPDATE about_content SET hero_image_url = ${PHOTOS.about} WHERE id = 1`;
    console.log('Set about page hero image');
    updated++;
  }

  const categories = await sql`SELECT id, slug, name, hero_image_url FROM categories`;
  for (const cat of categories) {
    const url = PHOTOS.categories[cat.slug];
    if (url && !cat.hero_image_url) {
      await sql`UPDATE categories SET hero_image_url = ${url} WHERE id = ${cat.id}`;
      console.log(`Set hero image for category "${cat.name}" (${cat.slug})`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated} image(s) set. Nothing with an existing photo was touched.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
