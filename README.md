# Buku Resep Pintar

Aplikasi ini dibuat dengan `React`, `Vite`, `Express`, dan `MySQL/MariaDB`.

README ini ditulis untuk pemula Windows yang ingin menjalankan proyek ini memakai `Laragon`.

## Gambaran Singkat

Laragon dipakai untuk menjalankan database `MySQL/MariaDB`.

Aplikasi ini tetap dijalankan lewat terminal `Node.js`:

- `npm run dev:api` untuk backend Express
- `npm run dev` untuk frontend React/Vite

Jadi, Laragon bukan dipakai untuk menjalankan seluruh aplikasi. Laragon hanya untuk database dan tools seperti `phpMyAdmin`.

## Yang Perlu Disiapkan

Pastikan sudah ada:

- `Laragon Full`
- `Node.js` versi LTS
- `VS Code`
- browser seperti Chrome atau Edge

Kalau belum ada `Node.js`, cek setelah instalasi:

```bash
node -v
npm -v
```

Kalau dua perintah itu menampilkan versi, berarti siap.

## Struktur Folder Penting

Pastikan Anda membuka folder proyek yang benar:

- Folder utama: `C:\Users\rifqi\Downloads\skripsi-masak-v2`
- Jangan buka folder dalamnya yang bernama `skripsi-masak-v2` lagi

Kalau Anda membuka folder yang salah, isi file bisa terlihat dobel dan terminal jadi membingungkan.

## Langkah Dari Awal

### 1. Buka Laragon

1. Klik `Start Menu` Windows.
2. Cari `Laragon`.
3. Buka aplikasi `Laragon`.
4. Di jendela Laragon, klik `Start All`.
5. Pastikan layanan `MySQL` berjalan.

Kalau menu Laragon muncul, Anda juga bisa buka:

- `Menu` > `MySQL` > `phpMyAdmin`

Biasanya user MySQL di Laragon adalah `root` dan password kosong.

### 2. Buka Proyek di VS Code

1. Buka `Visual Studio Code`.
2. Klik `File` > `Open Folder...`
3. Pilih folder:

```text
C:\Users\rifqi\Downloads\skripsi-masak-v2
```

4. Klik `Select Folder`.

Setelah itu, pastikan yang terlihat di panel kiri adalah file proyek seperti:

- `package.json`
- `server`
- `src`
- `database`
- `.env.example`

### 3. Buat File `.env`

Proyek ini butuh file `.env` di folder utama.

1. Di VS Code, buka terminal atau gunakan File Explorer.
2. Salin isi dari `.env.example` menjadi `.env`.

Kalau ingin cepat, Anda bisa pakai terminal PowerShell di folder proyek:

```powershell
Copy-Item .env.example .env
```

Isi `.env` yang dipakai:

```env
PORT=3001
JWT_SECRET=ganti_dengan_secret_yang_panjang
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=skripsi_masak
VITE_API_URL=/api
```

Kalau password MySQL Anda di Laragon tidak kosong, isi `DB_PASSWORD` sesuai password Anda.

### 4. Import Database

File database ada di:

```text
database/laragon.sql
```

Langkah import lewat `phpMyAdmin`:

1. Buka Laragon.
2. Pastikan `MySQL` aktif.
3. Buka `Menu` > `MySQL` > `phpMyAdmin`.
4. Login jika diminta.
5. Buat database baru dengan nama:

```text
skripsi_masak
```

6. Pilih database itu.
7. Klik tab `Import`.
8. Klik `Choose File`.
9. Pilih file:

```text
C:\Users\rifqi\Downloads\skripsi-masak-v2\database\laragon.sql
```

10. Klik `Go`.

Kalau import berhasil, tabel akan muncul otomatis.

Catatan:

- File SQL ini bisa menghapus dan membuat ulang tabel.
- Jangan import ke database yang salah.

### 5. Install Dependensi

Di terminal VS Code, posisikan diri di folder root proyek, lalu jalankan:

```bash
npm install
```

Tunggu sampai selesai.

## Cara Menjalankan Aplikasi

Anda perlu membuka 2 terminal.

### Terminal 1: Backend

Jalankan:

```bash
npm run dev:api
```

Kalau berhasil, backend Express berjalan di:

```text
http://localhost:3001
```

### Terminal 2: Frontend

Buka terminal baru, lalu jalankan:

```bash
npm run dev
```

Vite biasanya akan memberi alamat seperti:

```text
http://localhost:5173
```

Buka alamat itu di browser.

## Akun Login Awal

Data awal admin:

```text
Email: admin@example.com
Password: admin123
```

## Alur Pakai yang Benar

Urutan yang aman:

1. Buka Laragon.
2. Start `MySQL`.
3. Import `database/laragon.sql`.
4. Buka proyek di VS Code.
5. Buat file `.env`.
6. Jalankan `npm install`.
7. Jalankan `npm run dev:api`.
8. Jalankan `npm run dev`.
9. Buka browser ke alamat Vite.

## Cek Backend

Kalau ingin cek backend hidup atau tidak, buka:

```text
http://localhost:3001/api/health
```

Kalau berjalan normal, harus ada respons JSON dari server.

## Masalah Yang Sering Terjadi

### 1. `node` atau `npm` tidak dikenal

Artinya `Node.js` belum terpasang atau belum masuk `PATH`.

Solusi:

- Install ulang `Node.js` versi LTS
- Tutup lalu buka lagi terminal

### 2. Error koneksi database

Periksa ini:

- Laragon sudah berjalan
- `MySQL` aktif
- Nama database di `.env` sama dengan hasil import
- Username/password di `.env` benar

Contoh aman untuk Laragon default:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=skripsi_masak
```

### 3. Port bentrok

Kalau `3001` atau `5173` dipakai aplikasi lain, hentikan aplikasi itu atau ubah port di file konfigurasi.

### 4. Data tidak muncul

Biasanya karena database belum di-import atau `DB_NAME` salah.

Pastikan tabel `skripsi_masak` sudah ada di MySQL.

### 5. `phpMyAdmin` tidak bisa dibuka

Pastikan Laragon sudah aktif, lalu coba:

- `Menu` > `MySQL` > `phpMyAdmin`

Kalau masih gagal, cek apakah service MySQL benar-benar jalan.

## Build untuk Produksi

Kalau ingin build frontend:

```bash
npm run build
```

Kalau ingin menjalankan backend tanpa mode watch:

```bash
npm run start:api
```

## Catatan Penting

- Jangan buka folder nested `skripsi-masak-v2` yang ada di dalam folder utama.
- Laragon dipakai untuk database, bukan untuk menggantikan terminal Node.js.
- Kalau Anda baru mulai, ikuti langkah di atas secara urut dan jangan loncat.

