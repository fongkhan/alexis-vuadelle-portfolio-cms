import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { getPayload } from 'payload'
import config from '../payload.config'

function toBool(val: unknown, fallback = false): boolean {
  if (val === null || val === undefined) return fallback
  return Boolean(Number(val))
}

function toJson(val: unknown): unknown {
  if (!val) return null
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return null
    }
  }
  return val
}

async function migrateSqliteToPostgres() {
  const sqlitePath =
    process.env.SQLITE_PATH || path.resolve(process.cwd(), 'payload.db')

  if (!fs.existsSync(sqlitePath)) {
    console.error(`Fichier SQLite introuvable : ${sqlitePath}`)
    console.error(
      'Astuce : placez votre fichier payload.db à la racine du CMS ou définissez SQLITE_PATH=/chemin/vers/payload.db',
    )
    process.exit(1)
  }

  console.log(`Lecture de la base SQLite : ${sqlitePath}`)
  const sqlite = new DatabaseSync(sqlitePath, { open: true })

  console.log('Connexion à PostgreSQL et synchronisation du schéma Payload...')
  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool

  if (!pool) {
    throw new Error('Pool PostgreSQL introuvable sur payload.db')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Users
    const users = sqlite.prepare('SELECT * FROM users').all() as any[]
    console.log(`Migration de ${users.length} utilisateur(s)...`)
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, email, salt, hash, login_attempts, lock_until, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           salt = EXCLUDED.salt,
           hash = EXCLUDED.hash,
           updated_at = EXCLUDED.updated_at`,
        [
          u.id,
          u.email,
          u.salt,
          u.hash,
          u.login_attempts ?? 0,
          u.lock_until,
          u.created_at || new Date().toISOString(),
          u.updated_at || new Date().toISOString(),
        ],
      )
    }

    // 2. Media
    const mediaRows = sqlite.prepare('SELECT * FROM media').all() as any[]
    console.log(`Migration de ${mediaRows.length} média(s)...`)
    for (const m of mediaRows) {
      await client.query(
        `INSERT INTO media (id, alt, url, thumbnail_u_r_l, filename, mime_type, filesize, width, height, focal_x, focal_y, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           alt = EXCLUDED.alt,
           url = EXCLUDED.url,
           filename = EXCLUDED.filename,
           mime_type = EXCLUDED.mime_type,
           filesize = EXCLUDED.filesize,
           width = EXCLUDED.width,
           height = EXCLUDED.height,
           updated_at = EXCLUDED.updated_at`,
        [
          m.id,
          m.alt || m.filename || 'Media',
          m.url,
          m.thumbnail_u_r_l,
          m.filename,
          m.mime_type,
          m.filesize,
          m.width,
          m.height,
          m.focal_x ?? 50,
          m.focal_y ?? 50,
          m.created_at || new Date().toISOString(),
          m.updated_at || new Date().toISOString(),
        ],
      )
    }

    // 3. Projects
    const projects = sqlite.prepare('SELECT * FROM projects').all() as any[]
    console.log(`Migration de ${projects.length} projet(s)...`)
    for (const p of projects) {
      await client.query(
        `INSERT INTO projects (
           id, "order", title, slug, featured_image_id, image_display_mode,
           github_url, live_url, content, meta_title, meta_description, meta_image_id,
           created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           "order" = EXCLUDED."order",
           title = EXCLUDED.title,
           slug = EXCLUDED.slug,
           featured_image_id = EXCLUDED.featured_image_id,
           image_display_mode = EXCLUDED.image_display_mode,
           github_url = EXCLUDED.github_url,
           live_url = EXCLUDED.live_url,
           content = EXCLUDED.content,
           meta_title = EXCLUDED.meta_title,
           meta_description = EXCLUDED.meta_description,
           meta_image_id = EXCLUDED.meta_image_id,
           updated_at = EXCLUDED.updated_at`,
        [
          p.id,
          p.order ?? 0,
          p.title,
          p.slug,
          p.featured_image_id,
          p.image_display_mode || 'cover',
          p.github_url,
          p.live_url,
          toJson(p.content),
          p.meta_title,
          p.meta_description,
          p.meta_image_id,
          p.created_at || new Date().toISOString(),
          p.updated_at || new Date().toISOString(),
        ],
      )
    }

    // 4. Projects Tech Stack
    const techStack = sqlite
      .prepare('SELECT * FROM projects_tech_stack')
      .all() as any[]
    if (techStack.length > 0) {
      console.log(`Migration de ${techStack.length} tag(s) technos...`)
      for (const t of techStack) {
        await client.query(
          `INSERT INTO projects_tech_stack (_order, _parent_id, id, technology)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             _order = EXCLUDED._order,
             technology = EXCLUDED.technology`,
          [t._order, t._parent_id, String(t.id), t.technology],
        )
      }
    }

    // 5. Global: Profile
    const profiles = sqlite.prepare('SELECT * FROM profile').all() as any[]
    for (const prof of profiles) {
      console.log('Migration du global Profile...')
      await client.query(
        `INSERT INTO profile (id, name, github_link, linkedin_link, email, twitch_link, youtube_link, cv_file_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           github_link = EXCLUDED.github_link,
           linkedin_link = EXCLUDED.linkedin_link,
           email = EXCLUDED.email,
           twitch_link = EXCLUDED.twitch_link,
           youtube_link = EXCLUDED.youtube_link,
           cv_file_id = EXCLUDED.cv_file_id,
           updated_at = EXCLUDED.updated_at`,
        [
          prof.id,
          prof.name,
          prof.github_link,
          prof.linkedin_link,
          prof.email,
          prof.twitch_link,
          prof.youtube_link,
          prof.cv_file_id,
          prof.created_at || new Date().toISOString(),
          prof.updated_at || new Date().toISOString(),
        ],
      )
    }

    // 6. Global: HomePage
    const homePages = sqlite.prepare('SELECT * FROM home_page').all() as any[]
    for (const hp of homePages) {
      console.log('Migration du global HomePage...')
      await client.query(
        `INSERT INTO home_page (
           id, hero_headline, hero_description, profile_picture_id,
           projects_title, projects_subtitle, site_background_image_id,
           site_enable_parallax, site_parallax_rate, site_background_overlay_opacity,
           meta_title, meta_description, meta_image_id, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           hero_headline = EXCLUDED.hero_headline,
           hero_description = EXCLUDED.hero_description,
           profile_picture_id = EXCLUDED.profile_picture_id,
           projects_title = EXCLUDED.projects_title,
           projects_subtitle = EXCLUDED.projects_subtitle,
           site_background_image_id = EXCLUDED.site_background_image_id,
           site_enable_parallax = EXCLUDED.site_enable_parallax,
           site_parallax_rate = EXCLUDED.site_parallax_rate,
           site_background_overlay_opacity = EXCLUDED.site_background_overlay_opacity,
           meta_title = EXCLUDED.meta_title,
           meta_description = EXCLUDED.meta_description,
           meta_image_id = EXCLUDED.meta_image_id,
           updated_at = EXCLUDED.updated_at`,
        [
          hp.id,
          hp.hero_headline,
          hp.hero_description,
          hp.profile_picture_id,
          hp.projects_title || 'Projets',
          hp.projects_subtitle || 'Mes récents projets et réalisations.',
          hp.site_background_image_id,
          toBool(hp.site_enable_parallax, false),
          hp.site_parallax_rate ?? 20,
          hp.site_background_overlay_opacity ?? 80,
          hp.meta_title,
          hp.meta_description,
          hp.meta_image_id,
          hp.created_at || new Date().toISOString(),
          hp.updated_at || new Date().toISOString(),
        ],
      )
    }

    // 7. Global: AboutPage
    const aboutPages = sqlite.prepare('SELECT * FROM about_page').all() as any[]
    for (const ap of aboutPages) {
      console.log('Migration du global AboutPage...')
      await client.query(
        `INSERT INTO about_page (
           id, title, subtitle, content, background_image_id,
           enable_parallax, parallax_rate, background_overlay_opacity,
           meta_title, meta_description, meta_image_id, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle,
           content = EXCLUDED.content,
           background_image_id = EXCLUDED.background_image_id,
           enable_parallax = EXCLUDED.enable_parallax,
           parallax_rate = EXCLUDED.parallax_rate,
           background_overlay_opacity = EXCLUDED.background_overlay_opacity,
           meta_title = EXCLUDED.meta_title,
           meta_description = EXCLUDED.meta_description,
           meta_image_id = EXCLUDED.meta_image_id,
           updated_at = EXCLUDED.updated_at`,
        [
          ap.id,
          ap.title,
          ap.subtitle,
          toJson(ap.content),
          ap.background_image_id,
          toBool(ap.enable_parallax, false),
          ap.parallax_rate ?? 20,
          ap.background_overlay_opacity ?? 60,
          ap.meta_title,
          ap.meta_description,
          ap.meta_image_id,
          ap.created_at || new Date().toISOString(),
          ap.updated_at || new Date().toISOString(),
        ],
      )
    }

    // Reset PostgreSQL serial sequences so future inserts don't collide on ID
    for (const table of ['users', 'media', 'projects', 'profile', 'home_page', 'about_page']) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 1),
          (SELECT COUNT(*) > 0 FROM ${table})
        )
      `)
    }

    await client.query('COMMIT')
    console.log('✅ Migration SQLite -> PostgreSQL terminée avec succès !')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    sqlite.close()
    if (typeof payload.db?.destroy === 'function') {
      await payload.db.destroy()
    }
  }
}

migrateSqliteToPostgres().catch((err) => {
  console.error('❌ Échec de la migration SQLite -> PostgreSQL :', err)
  process.exit(1)
})
