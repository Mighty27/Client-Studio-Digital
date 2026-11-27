# Lumina Proof — Sistem Seleksi Foto Klien (Client Proofing)

Aplikasi web **Client Proofing** siap produksi untuk studio fotografi menggunakan **React (Vite)**, **Bootstrap 5**, **Bootstrap Icons**, **Google Drive API v3**, dan **Supabase**.

## Fitur Utama

1. **Proteksi PIN Akses Klien (Privacy Lock)**
   - Setiap sesi dilindungi PIN 4–6 digit yang ditentukan admin studio.
   - Status sesi terbuka disimpan di `sessionStorage`.
2. **Integrasi Link Folder Google Drive & Fallback Mode**
   - Parser otomatis mengekstrak `Folder ID` dari berbagai format tautan Google Drive.
   - Fetch file gambar (`image/jpeg`, `image/png`) via Google Drive API v3 (`VITE_GOOGLE_DRIVE_API_KEY`).
   - Jika API Key belum diisi, aplikasi otomatis berjalan dalam **Mode Simulasi (12 Foto Studio)** agar langsung siap diuji.
3. **Limitasi Kuota Paket Otomatis (Hard Quota Lock)**
   - Sticky header bar menampilkan nama sesi, hitungan real-time (`Terpilih X / Maksimal Y Foto`), dan progress bar.
   - Otomatis mengunci & meredupkan kartu foto lain ketika kuota penuh.
4. **Masa Aktif Galeri & Auto-Lock (Expiration Control)**
   - Menutup galeri secara otomatis jika melewati tanggal `expires_at`.
5. **Dashboard Admin Studio & One-Click Copy Nama File**
   - Manajemen sesi lengkap + salin link klien (`?session=<id>`).
   - Monitoring foto terpilih secara real-time.
   - Ekspor daftar nama file dalam format dipisah **Koma** (Windows Explorer / macOS Finder), **Spasi**, atau **Baris Baru** (Adobe Lightroom) dengan satu klik.

## Instalasi Dependencies & Menjalankan Lokal

```bash
# 1. Install seluruh dependencies
npm install

# Jika memulai proyek dari nol, paket utama yang digunakan:
# npm install bootstrap bootstrap-icons @supabase/supabase-js

# 2. Salin konfigurasi environment
cp .env.example .env

# 3. Jalankan server pengembangan
npm run dev
```

## Konfigurasi Environment (`.env`)

- `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: Opsional. Jika belum diisi, aplikasi otomatis menggunakan `localStorage` sebagai penyimpanan lokal yang persisten.
- `VITE_GOOGLE_DRIVE_API_KEY`: Opsional. Jika belum diisi, galeri menggunakan 12 foto studio simulasi bawaan.

## Setup Database Supabase

1. Buka **SQL Editor** di dashboard proyek Supabase Anda.
2. Jalankan seluruh isi file `supabase_schema.sql` untuk membuat tabel `sessions` dan `selections`.
3. Pastikan folder Google Drive klien berstatus *"Anyone with the link (Viewer)"* agar API v3 dapat membaca daftar foto secara publik menggunakan API Key.

## Build & Deploy ke Netlify

File `netlify.toml` sudah disertakan untuk menangani SPA routing (`/* -> /index.html`).

```bash
npm run build
```

Upload folder `dist/` ke Netlify atau hubungkan repositori GitHub langsung ke Netlify dengan build command `npm run build` dan publish directory `dist`.
