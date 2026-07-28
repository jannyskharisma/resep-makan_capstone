import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3001
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-ganti-di-env'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')

// Pool MySQL/MariaDB ini cocok untuk Laragon default.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skripsi_masak',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
})

app.use(cors())
app.use(express.json())
app.use(express.static(distDir))

// Helper standar agar error database/API selalu punya format yang konsisten.
function kirimError(res, status, message) {
  return res.status(status).json({ error: message })
}

function parseJsonField(value, fallback) {
  if (value == null) return fallback
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function formatBahan(row) {
  return {
    ...row,
    status_validasi: Boolean(row.status_validasi),
  }
}

function formatResep(row) {
  return {
    ...row,
    langkah_memasak: parseJsonField(row.langkah_memasak, []),
    recipe_ingredients: parseJsonField(row.recipe_ingredients, []),
  }
}

// Token berisi data minimum yang dibutuhkan UI: id, email, dan role.
function buatToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '7d' },
  )
}

function formatSession(user, token) {
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  }
}

// Middleware auth membaca header Bearer token sebelum route yang butuh login.
function wajibLogin(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) return kirimError(res, 401, 'Token login tidak ditemukan.')

  try {
    req.user = jwt.verify(token, jwtSecret)
    return next()
  } catch {
    return kirimError(res, 401, 'Sesi sudah tidak valid, silakan login ulang.')
  }
}

// Middleware admin menjaga route moderasi agar tidak bisa dipakai user biasa.
function wajibAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return kirimError(res, 403, 'Akses admin diperlukan.')
  }

  return next()
}

app.get('/api/health', async (_req, res) => {
  const [rows] = await pool.query('SELECT NOW() AS waktu_database')
  res.json({ ok: true, database: rows[0].waktu_database })
})

app.get('/api/auth/session', wajibLogin, async (req, res) => {
  // Session divalidasi ulang ke database agar perubahan role langsung terbaca.
  const [rows] = await pool.query(
    'SELECT id, email, role FROM users WHERE id = ?',
    [req.user.id],
  )

  if (rows.length === 0) return kirimError(res, 401, 'User tidak ditemukan.')

  res.json({ session: formatSession(rows[0], req.headers.authorization.slice(7)) })
})

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!email || !password) {
    return kirimError(res, 400, 'Email dan password wajib diisi.')
  }

  if (password.length < 6) {
    return kirimError(res, 400, 'Password minimal 6 karakter.')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, passwordHash, 'user'],
    )

    res.status(201).json({ message: 'Pendaftaran berhasil.' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return kirimError(res, 409, 'Email sudah terdaftar.')
    }

    throw error
  }
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  const [rows] = await pool.query(
    'SELECT id, email, password_hash, role FROM users WHERE email = ?',
    [email],
  )

  const user = rows[0]
  const passwordCocok = user ? await bcrypt.compare(password, user.password_hash) : false

  if (!passwordCocok) return kirimError(res, 401, 'Email atau password salah.')

  const token = buatToken(user)
  res.json({ session: formatSession(user, token) })
})

app.get('/api/initial-data', wajibLogin, async (_req, res) => {
  // Query resep dibuat JSON aggregate agar bentuk data sama dengan select Supabase lama.
  const [ingredientsResult, recipesResult] = await Promise.all([
    pool.query(
      'SELECT id, nama_bahan, kategori, status_validasi FROM ingredients WHERE status_validasi = TRUE ORDER BY nama_bahan ASC',
    ),
    pool.query(`
      SELECT
        r.id,
        r.judul_resep,
        r.langkah_memasak,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('ingredient_id', ri.ingredient_id) ORDER BY ri.ingredient_id)
            FROM recipe_ingredients ri
            WHERE ri.recipe_id = r.id
          ),
          JSON_ARRAY()
        ) AS recipe_ingredients
      FROM recipes r
      ORDER BY r.created_at DESC, r.id DESC
    `),
  ])

  res.json({
    bahan: ingredientsResult[0].map(formatBahan),
    resep: recipesResult[0].map(formatResep),
  })
})

app.get('/api/ingredients/pending', wajibLogin, wajibAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nama_bahan, kategori, status_validasi FROM ingredients WHERE status_validasi = FALSE ORDER BY created_at ASC',
  )

  res.json({ bahan: rows.map(formatBahan) })
})

app.post('/api/ingredients', wajibLogin, async (req, res) => {
  const namaBahan = String(req.body.nama_bahan || '').trim()
  const kategori = String(req.body.kategori || 'Lainnya').trim()

  if (!namaBahan) return kirimError(res, 400, 'Nama bahan wajib diisi.')

  try {
    const [result] = await pool.query(
      'INSERT INTO ingredients (nama_bahan, kategori, status_validasi) VALUES (?, ?, FALSE)',
      [namaBahan, kategori],
    )
    const [rows] = await pool.query(
      'SELECT id, nama_bahan, kategori, status_validasi FROM ingredients WHERE id = ?',
      [result.insertId],
    )

    res.status(201).json({ bahan: formatBahan(rows[0]) })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return kirimError(res, 409, 'Bahan sudah terdaftar!')
    }

    throw error
  }
})

app.patch('/api/ingredients/:id/approve', wajibLogin, wajibAdmin, async (req, res) => {
  const [result] = await pool.query(
    'UPDATE ingredients SET status_validasi = TRUE WHERE id = ?',
    [req.params.id],
  )

  if (result.affectedRows === 0) return kirimError(res, 404, 'Bahan tidak ditemukan.')

  const [rows] = await pool.query(
    'SELECT id, nama_bahan, kategori, status_validasi FROM ingredients WHERE id = ?',
    [req.params.id],
  )

  res.json({ bahan: formatBahan(rows[0]) })
})

app.post('/api/recipes', wajibLogin, async (req, res) => {
  const judulResep = String(req.body.judul_resep || '').trim()
  const porsiDefault = Number.parseInt(req.body.porsi_default, 10) || 1
  const langkahMemasak = Array.isArray(req.body.langkah_memasak) ? req.body.langkah_memasak : []
  const ingredientIds = Array.isArray(req.body.ingredient_ids) ? req.body.ingredient_ids : []

  if (!judulResep || ingredientIds.length === 0) {
    return kirimError(res, 400, 'Judul resep dan minimal 1 bahan wajib diisi.')
  }

  const client = await pool.getConnection()

  try {
    // Transaksi memastikan resep dan relasi bahan dibuat sebagai satu operasi utuh.
    await client.beginTransaction()

    const [recipeResult] = await client.query(
      'INSERT INTO recipes (judul_resep, porsi_default, langkah_memasak) VALUES (?, ?, ?)',
      [judulResep, porsiDefault, JSON.stringify(langkahMemasak)],
    )

    const resepId = recipeResult.insertId

    for (const ingredientId of ingredientIds) {
      await client.query(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, kuantitas, satuan) VALUES (?, ?, ?, ?)',
        [resepId, ingredientId, 1, 'secukupnya'],
      )
    }

    await client.commit()
    const [rows] = await pool.query(
      'SELECT id, judul_resep, langkah_memasak FROM recipes WHERE id = ?',
      [resepId],
    )
    res.status(201).json({ resep: formatResep({ ...rows[0], recipe_ingredients: [] }) })
  } catch (error) {
    await client.rollback()
    throw error
  } finally {
    client.release()
  }
})

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

// Handler terakhir agar error async tidak membocorkan detail internal ke browser.
app.use((error, _req, res, next) => {
  void next
  console.error(error)
  kirimError(res, 500, 'Terjadi kesalahan server.')
})

app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`)
})
