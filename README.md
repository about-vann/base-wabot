# Base WaBot

Base WhatsApp bot sederhana untuk dijadikan kerangka pengembangan.

## Tujuan

Repository ini sengaja dibuat **tanpa fitur bot dari script asli**. Yang dipertahankan adalah fondasi koneksi WhatsApp dan struktur database yang sebelumnya berada di `handler.js`, sehingga pengguna bisa membangun fitur mereka sendiri tanpa harus membuat schema database dari nol.

## Struktur

```text
base-wabot/
├── handler.js       # message handler + database schema
├── main.js          # koneksi WhatsApp
├── setting.js       # konfigurasi dasar
├── database.json    # database kosong
├── plugins/
│   └── example.js   # template plugin kosong
├── package.json
└── .gitignore
```

## Menjalankan

```bash
npm install
npm start
```

Scan QR WhatsApp yang muncul di terminal. Session disimpan di folder `session/` dan tidak di-upload ke GitHub.

## Database

`handler.js` mempertahankan struktur field user, chat, settings, bot stock, monsters, dan tembak dari schema asli. Data pengguna nyata tidak disertakan dalam repository publik ini.

## Menambahkan fitur

Tidak ada command bawaan. Gunakan `plugins/example.js` sebagai titik awal untuk membuat sistem command atau fitur sendiri.

> Base only. Build your own bot.
