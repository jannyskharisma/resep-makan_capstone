const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'skripsi_masak_token'

// Token JWT disimpan di browser agar session tetap ada setelah refresh halaman.
export function ambilTokenTersimpan() {
  return localStorage.getItem(TOKEN_KEY)
}

export function simpanToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function hapusToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Wrapper fetch ini menyatukan base URL, JSON body, auth header, dan format error API.
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Request API gagal.')
  }

  return data
}

export const api = {
  // Auth dipisah dari komponen supaya App.jsx fokus pada state dan tampilan.
  daftar: (email, password) => request('/auth/register', {
    method: 'POST',
    body: { email, password },
  }),
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: { email, password },
  }),
  cekSession: (token) => request('/auth/session', { token }),

  // Endpoint data menggantikan query Supabase ke ingredients, recipes, dan relasi resep.
  ambilDataAwal: (token) => request('/initial-data', { token }),
  ambilBahanTertunda: (token) => request('/ingredients/pending', { token }),
  tambahBahan: (token, payload) => request('/ingredients', {
    method: 'POST',
    token,
    body: payload,
  }),
  setujuiBahan: (token, idBahan) => request(`/ingredients/${idBahan}/approve`, {
    method: 'PATCH',
    token,
  }),
  tambahResep: (token, payload) => request('/recipes', {
    method: 'POST',
    token,
    body: payload,
  }),
}
