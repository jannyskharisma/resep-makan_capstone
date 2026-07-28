import { useEffect, useMemo, useState } from 'react'
import { ambilTokenTersimpan, api, hapusToken, simpanToken } from './api'
import './index.css'

function App() {
  const [session, setSession] = useState(null)
  const [token, setToken] = useState('')
  const [userRole, setUserRole] = useState('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [dataBahan, setDataBahan] = useState([])
  const [bahanTertunda, setBahanTertunda] = useState([])
  const [dataResep, setDataResep] = useState([])
  const [kulkasUser, setKulkasUser] = useState([])

  const [inputNamaBahan, setInputNamaBahan] = useState('')
  const [inputKategori, setInputKategori] = useState('Sayuran')
  const [pesanStatus, setPesanStatus] = useState('')

  const [judulResep, setJudulResep] = useState('')
  const [porsiDefault, setPorsiDefault] = useState(2)
  const [langkahResep, setLangkahResep] = useState([{ instruksi: '' }])
  const [bahanResepDipilih, setBahanResepDipilih] = useState([])
  const [pesanResep, setPesanResep] = useState('')

  // State ini mengunci tombol saat request API sedang berjalan agar data tidak dobel.
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isSubmittingResep, setIsSubmittingResep] = useState(false)
  const [isSubmittingBahan, setIsSubmittingBahan] = useState(false)

  // Saat aplikasi dibuka, token lokal dicek ke backend pengganti Supabase Auth.
  useEffect(() => {
    const tokenTersimpan = ambilTokenTersimpan()

    if (!tokenTersimpan) return

    let aktif = true

    api.cekSession(tokenTersimpan)
      .then(({ session: sessionValid }) => {
        if (!aktif) return
        setToken(sessionValid.token)
        setSession(sessionValid)
        setUserRole(sessionValid.user.role)
      })
      .catch(() => {
        hapusToken()
        if (aktif) setSession(null)
      })

    return () => { aktif = false }
  }, [])

  // Data utama diambil setelah user login karena semua endpoint aplikasi wajib token.
  async function initData(tokenAktif = token) {
    const { bahan, resep } = await api.ambilDataAwal(tokenAktif)
    setDataBahan(bahan || [])
    setDataResep(resep || [])
  }

  async function ambilBahanTertunda(tokenAktif = token) {
    const { bahan } = await api.ambilBahanTertunda(tokenAktif)
    setBahanTertunda(bahan || [])
  }

  useEffect(() => {
    if (!session || !token) return

    let aktif = true

    api.ambilDataAwal(token).then(({ bahan, resep }) => {
      if (!aktif) return
      setDataBahan(bahan || [])
      setDataResep(resep || [])
    })

    return () => { aktif = false }
  }, [session, token])

  useEffect(() => {
    if (!session || !token || userRole !== 'admin') return

    let aktif = true

    api.ambilBahanTertunda(token).then(({ bahan }) => {
      if (aktif) setBahanTertunda(bahan || [])
    })

    return () => { aktif = false }
  }, [session, token, userRole])

  // Jaccard Similarity menghitung kemiripan bahan di kulkas user dengan bahan resep.
  function hitungJaccard(bahanUser, bahanResep) {
    const setA = new Set(bahanUser)
    const setB = new Set(bahanResep)
    const irisan = new Set([...setA].filter((x) => setB.has(x)))
    const gabungan = new Set([...setA, ...setB])
    return gabungan.size === 0 ? 0 : irisan.size / gabungan.size
  }

  const hasilRekomendasi = useMemo(() => {
    if (dataResep.length === 0) return []

    const hasil = dataResep.map((resep) => {
      const idBahanResep = resep.recipe_ingredients.map((ri) => ri.ingredient_id)
      const skor = hitungJaccard(kulkasUser, idBahanResep)
      return {
        id: resep.id,
        judul: resep.judul_resep,
        langkah: resep.langkah_memasak,
        persentase: Math.round(skor * 100),
      }
    })

    hasil.sort((a, b) => b.persentase - a.persentase)
    return hasil
  }, [kulkasUser, dataResep])

  const handleUbahLangkah = (index, value) => {
    const listLangkahBaru = [...langkahResep]
    listLangkahBaru[index].instruksi = value
    setLangkahResep(listLangkahBaru)
  }

  const handleTambahInputLangkah = () => {
    setLangkahResep([...langkahResep, { instruksi: '' }])
  }

  const handleCheckboxBahanResep = (idBahan) => {
    bahanResepDipilih.includes(idBahan)
      ? setBahanResepDipilih(bahanResepDipilih.filter((id) => id !== idBahan))
      : setBahanResepDipilih([...bahanResepDipilih, idBahan])
  }

  const handleTambahResepBaru = async (e) => {
    e.preventDefault()
    if (isSubmittingResep) return

    setPesanResep('')

    if (!judulResep.trim() || bahanResepDipilih.length === 0) {
      setPesanResep('Gagal: Judul resep dan minimal 1 bahan wajib diisi!')
      return
    }

    setIsSubmittingResep(true)

    try {
      const langkahValid = langkahResep.filter((l) => l.instruksi.trim() !== '')

      // Payload ini dikirim ke API Express, lalu API menyimpan resep dan relasi bahan ke MySQL Laragon.
      await api.tambahResep(token, {
        judul_resep: judulResep.trim(),
        porsi_default: porsiDefault,
        langkah_memasak: langkahValid,
        ingredient_ids: bahanResepDipilih,
      })

      setPesanResep('Sukses! Resep baru berhasil diterbitkan ke sistem.')
      setJudulResep('')
      setLangkahResep([{ instruksi: '' }])
      setBahanResepDipilih([])
      await initData()
    } catch (error) {
      setPesanResep('Error input resep: ' + error.message)
    } finally {
      setIsSubmittingResep(false)
    }
  }

  const handleTambahBahanBaru = async (e) => {
    e.preventDefault()
    if (isSubmittingBahan) return

    setPesanStatus('')
    if (!inputNamaBahan.trim()) return

    setIsSubmittingBahan(true)

    try {
      // Bahan baru masuk sebagai status_validasi=false, lalu admin menyetujuinya dari panel moderasi.
      await api.tambahBahan(token, {
        nama_bahan: inputNamaBahan.trim(),
        kategori: inputKategori,
      })

      setPesanStatus('Sukses mengusulkan bahan baru!')
      setInputNamaBahan('')
      if (userRole === 'admin') await ambilBahanTertunda()
    } catch (error) {
      setPesanStatus(error.message)
    } finally {
      setIsSubmittingBahan(false)
    }
  }

  const handleAuth = async (tipe) => {
    if (isSubmittingAuth) return

    setPesanStatus('')
    setIsSubmittingAuth(true)

    try {
      if (tipe === 'daftar') {
        await api.daftar(email, password)
        setPesanStatus('Pendaftaran berhasil! Silakan coba login.')
        return
      }

      const { session: sessionBaru } = await api.login(email, password)
      simpanToken(sessionBaru.token)
      setToken(sessionBaru.token)
      setSession(sessionBaru)
      setUserRole(sessionBaru.user.role)
      setPesanStatus('Login sukses!')
    } catch (error) {
      setPesanStatus('Gagal: ' + error.message)
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  const handleSetujuiBahan = async (idBahan) => {
    try {
      await api.setujuiBahan(token, idBahan)
      await initData()
      await ambilBahanTertunda()
    } catch (error) {
      setPesanStatus(error.message)
    }
  }

  const handleLogout = () => {
    hapusToken()
    setToken('')
    setSession(null)
    setEmail('')
    setPassword('')
    setPesanStatus('')
    setKulkasUser([])
    setUserRole('user')
  }

  const handleCheckboxChange = (idBahan) => {
    kulkasUser.includes(idBahan)
      ? setKulkasUser(kulkasUser.filter((id) => id !== idBahan))
      : setKulkasUser([...kulkasUser, idBahan])
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-gray-100">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Buku Resep Pintar 🍳</h2>
          <div className="space-y-4 mt-6">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />

            <div className="flex gap-3">
              <button
                onClick={() => handleAuth('login')}
                disabled={isSubmittingAuth}
                className="flex-1 bg-orange-500 disabled:bg-orange-300 text-white p-3 rounded-lg font-semibold transition"
              >
                {isSubmittingAuth ? 'Memproses...' : 'Masuk'}
              </button>
              <button
                onClick={() => handleAuth('daftar')}
                disabled={isSubmittingAuth}
                className="flex-1 bg-gray-200 disabled:bg-gray-100 text-gray-700 disabled:text-gray-400 p-3 rounded-lg font-semibold transition"
              >
                {isSubmittingAuth ? 'Memproses...' : 'Daftar'}
              </button>
            </div>
          </div>
          {pesanStatus && <p className="text-center mt-4 text-sm text-red-500">{pesanStatus}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-12">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center max-w-5xl mx-auto rounded-b-xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Buku Resep Pintar 🍳</h1>
          <p className="text-xs text-gray-500">User: {session.user.email} <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded capitalize">{userRole}</span></p>
        </div>
        <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm transition font-medium">Keluar</button>
      </nav>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {userRole === 'admin' && (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-blue-900 mb-2">🛡️ Panel Moderasi Admin: Peninjauan Bahan Baru</h3>
            {bahanTertunda.length === 0 ? <p className="text-sm text-blue-600 italic">Tidak ada usulan bahan.</p> : (
              <div className="space-y-2">{bahanTertunda.map((b) => (
                <div key={b.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100 shadow-xs">
                  <div><span className="font-semibold">{b.nama_bahan}</span><span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{b.kategori}</span></div>
                  <button onClick={() => handleSetujuiBahan(b.id)} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">Setujui</button>
                </div>
              ))}</div>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">➕ Bagikan Resep Masakan Anda</h3>
          <p className="text-sm text-gray-500 mb-6">Tulis instruksi memasak secara detail agar sistem bisa merekomendasikannya [Dapur Umami].</p>

          <form onSubmit={handleTambahResepBaru} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nama Menu Masakan</label>
                <input type="text" placeholder="Contoh: Nasi Goreng Kampung, Sup Ayam" value={judulResep} onChange={(e) => setJudulResep(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estimasi Porsi</label>
                <input type="number" min="1" value={porsiDefault} onChange={(e) => setPorsiDefault(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pilih Bahan Baku yang Digunakan:</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border p-3 rounded-xl bg-gray-50">
                {dataBahan.map((bahan) => (
                  <label key={bahan.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition ${bahanResepDipilih.includes(bahan.id) ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white text-gray-600'}`}>
                    <input type="checkbox" checked={bahanResepDipilih.includes(bahan.id)} onChange={() => handleCheckboxBahanResep(bahan.id)} className="hidden" />
                    {bahan.nama_bahan}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Langkah Demi Langkah Memasak [Dapur Umami]:</label>
              {langkahResep.map((langkah, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{index + 1}</span>
                  <input type="text" placeholder={`Langkah ke-${index + 1}...`} value={langkah.instruksi} onChange={(e) => handleUbahLangkah(index, e.target.value)} className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
              ))}
              <button type="button" onClick={handleTambahInputLangkah} className="text-orange-600 hover:text-orange-700 font-bold text-sm flex items-center gap-1 pt-1 transition">
                + Tambah Langkah Memasak
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmittingResep}
              className="w-full bg-orange-500 disabled:bg-orange-300 hover:bg-orange-600 text-white font-bold p-3.5 rounded-xl transition shadow-sm"
            >
              {isSubmittingResep ? 'Sedang Menerbitkan...' : 'Terbitkan Buku Resep'}
            </button>
          </form>
          {pesanResep && <p className={`mt-3 font-semibold text-center text-sm ${pesanResep.includes('Sukses') ? 'text-green-600' : 'text-red-500'}`}>{pesanResep}</p>}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-amber-900 mb-2">Punya Bahan Unik?</h3>
          <form onSubmit={handleTambahBahanBaru} className="flex flex-wrap gap-3 items-center">
            <input type="text" placeholder="Daun Kelor, Jamur..." value={inputNamaBahan} onChange={(e) => setInputNamaBahan(e.target.value)} className="flex-1 min-w-[200px] p-3 bg-white border border-amber-300 rounded-xl outline-none text-sm" />
            <select value={inputKategori} onChange={(e) => setInputKategori(e.target.value)} className="p-3 bg-white border border-amber-300 rounded-xl text-sm">
              <option value="Sayuran">Sayuran</option><option value="Protein">Protein</option><option value="Bumbu">Bumbu</option>
            </select>
            <button
              type="submit"
              disabled={isSubmittingBahan}
              className="bg-amber-500 disabled:bg-amber-300 text-white font-semibold px-6 py-3 rounded-xl text-sm shadow-sm transition"
            >
              {isSubmittingBahan ? 'Mengirim...' : 'Usulkan'}
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Isi Kulkas Anda</h3>
          <div className="flex flex-wrap gap-2 mt-4">
            {dataBahan.map((bahan) => (
              <label key={bahan.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium cursor-pointer transition ${kulkasUser.includes(bahan.id) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                <input type="checkbox" checked={kulkasUser.includes(bahan.id)} onChange={() => handleCheckboxChange(bahan.id)} className="hidden" />
                {bahan.nama_bahan}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Rekomendasi Menu Masakan</h3>
          {hasilRekomendasi.map((resep) => (
            <div key={resep.id} className={`border p-6 rounded-2xl transition bg-white ${resep.persentase > 0 ? 'border-emerald-200 ring-4 ring-emerald-500/5' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start gap-4">
                <h4 className="text-xl font-bold text-gray-900">{resep.judul}</h4>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${resep.persentase > 50 ? 'bg-emerald-100 text-emerald-700' : resep.persentase > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                  Cocok: {resep.persentase}%
                </span>
              </div>
              {resep.persentase > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h5 className="font-semibold text-sm mb-2">Langkah Memasak:</h5>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    {resep.langkah?.map((l, idx) => <li key={idx} className="pl-1">{l.instruksi}</li>)}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
