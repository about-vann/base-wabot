# Base WaBot

> A clean and extensible WhatsApp bot base built with **Baileys**.

Base WaBot is a minimal starting point for building your own WhatsApp bot. The repository provides the connection layer, message serialization, reusable helper utilities, plugin system, and the database structure required by the base.

It is intentionally shipped without the original bot's feature collection. You get the **framework**, then build the commands and features yourself.

---

## ✨ Highlights

- 📱 WhatsApp connection using `@whiskeysockets/baileys`
- 🔌 Simple plugin-based command system
- 🧩 `handler.command`, `handler.help`, and `handler.tags` plugin structure
- 📨 Message serializer through `lib/simple.js`
- 🛠️ Reusable utilities in `lib/function.js`
- 🔘 Button, ButtonV2, Carousel, and AIRich builders
- 🖼️ Basic media utilities
- 💾 Persistent JSON database
- 🔄 Automatic reconnection when the connection closes unexpectedly
- 📁 Clean and easy-to-expand project structure
- 🚫 No original bot feature collection included

---

## 📦 Requirements

- **Node.js** 18 or newer
- A WhatsApp account for the bot session
- Internet connection

---

## 🚀 Installation

Clone the repository and install its dependencies:

```bash
git clone https://github.com/about-vann/base-wabot.git
cd base-wabot
npm install
```

Start the bot with:

```bash
npm start
```

On the first run, authenticate the WhatsApp session using the QR/pairing flow provided by the Baileys configuration.

The authentication files are stored in `session/` and should never be committed to the repository.

---

## 🗂️ Project Structure

```text
base-wabot/
│
├── main.js
├── handler.js
├── setting.js
├── database.json
├── package.json
├── README.md
├── .gitignore
│
├── lib/
│   ├── simple.js
│   ├── function.js
│   └── media.js
│
├── plugins/
│   └── example.js
│
└── media/
    └── .gitkeep
```

### `main.js`

The main entry point of the bot.

Its responsibilities are intentionally limited to the WhatsApp connection layer:

1. Create/load the authentication state.
2. Create the Baileys socket.
3. Save authentication credentials.
4. Receive incoming messages.
5. Pass messages to `handler.js`.
6. Handle connection changes and reconnect when appropriate.

The main file does **not** contain the bot's command collection.

### `handler.js`

The central message-processing layer.

It connects the serialized message with the plugin system and database. This file also contains the preserved database schema that forms the foundation of the base.

The general flow is:

```text
WhatsApp
   ↓
main.js
   ↓
handler.js
   ↓
lib/simple.js
   ↓
command parser
   ↓
plugins/*.js
   ↓
response
```

### `setting.js`

Contains basic bot configuration that can be adjusted independently from the message handler.

### `database.json`

The default persistent database file used by the base. It is intended to provide the initial structure for users, chats, settings, and other database sections.

### `lib/simple.js`

The message serializer.

It converts a raw WhatsApp message into a more convenient message object for plugins, including commonly used properties such as:

```js
m.chat
m.sender
m.text
m.isGroup
m.quoted
m.reply()
m.react()
m.download()
```

This keeps plugins from having to deal with the raw Baileys message structure every time.

### `lib/function.js`

A collection of reusable helpers and message builders.

It currently provides utilities and builders such as:

- `Button`
- `ButtonV2`
- `Carousel`
- `AIRich`
- `sendButton()`
- `sendAlbum()`
- `ceciliafunc()`
- mention helpers
- buffer fetching
- media downloading
- general utility functions

Example import:

```js
import { Button, AIRich, sendButton } from '../lib/function.js'
```

### `lib/media.js`

Provides basic media/file handling utilities that can be reused by plugins.

### `plugins/`

This is where your bot features belong.

The base intentionally keeps this directory minimal. Add each feature as a separate plugin instead of putting all commands inside `main.js` or `handler.js`.

### `media/`

Reserved for bot assets such as images and other local media files. The directory is intentionally empty in the base.

---

## 🔌 Plugin Model

Plugins use a simple exported handler object/function model.

A basic command can follow this pattern:

```js
const handler = async (m, { text, args, command, usedPrefix }) => {
  await m.reply(`Hello ${m.pushName || 'there'}!`)
}

handler.command = ['hello']
handler.help = ['hello']
handler.tags = ['main']

export default handler
```

The command can then be called with:

```text
!hello
```

The default prefix parser currently recognizes:

```text
!
#
.
/
?
```

The plugin receives useful context through the second argument:

```js
{
  conn,
  m,
  text,
  args,
  command,
  usedPrefix,
  user,
  db
}
```

This makes the base easy to extend without changing the core connection code.

---

## 🧩 Database Model

The database is intentionally kept simple: a JSON object that can be persisted to disk.

At the top level, the base provides sections such as:

```js
{
  users: {},
  chats: {},
  settings: {},
  bots: {
    stock: {}
  },
  monsters: [],
  tembak: {}
}
```

### Users

User data is stored by WhatsApp JID:

```text
users[sender]
```

The preserved user schema contains the foundation for account information, limits, experience, levels, economy, inventory, pets, food, farming, hunting, missions, and other database fields.

The base initializes missing fields automatically so a new user can be inserted without manually constructing the complete schema.

### Chats

Chat-specific data is stored by chat JID:

```text
chats[chatId]
```

This gives future plugins a dedicated place for group/chat configuration.

### Settings

Bot-specific settings are stored using the bot JID as the key. The base initializes the basic settings object automatically.

### Why keep this schema?

The database structure is deliberately preserved because it is one of the harder parts of a bot architecture to design from scratch. The base therefore gives developers a ready foundation while leaving the actual bot features for them to implement.

---

## 🔘 Message Builders

`lib/function.js` includes reusable builders for richer WhatsApp messages.

For example, the `Button` builder can be used to construct interactive messages without putting the implementation directly into a plugin.

```js
import { Button } from '../lib/function.js'

const button = new Button(conn)
  .setTitle('Example')
  .setBody('Choose an option')
  .addReply('Hello', 'hello')

await button.send(m.chat)
```

`AIRich` is also available for building rich-response payloads:

```js
import { AIRich } from '../lib/function.js'

const rich = new AIRich(conn)
  .setTitle('Base WaBot')
  .addText('Hello from the base bot!')

await rich.send(m.chat)
```

These builders are included as **utilities**, not as built-in bot features.

---

## 🔐 Session & Privacy

Never commit the following to a public repository:

- WhatsApp authentication/session files
- Personal credentials
- API keys
- Private tokens
- Personal database exports

The repository is intended to contain the **base structure**, not private bot data.

---

## 🧱 Philosophy

Base WaBot follows a simple principle:

> **Core stays small. Features stay in plugins.**

The connection layer should not become a huge collection of commands. New functionality should normally be implemented inside `plugins/`, while reusable low-level helpers belong in `lib/`.

This makes the project easier to understand, maintain, and extend.

---

## 📄 License

This project is released under the **MIT License**.

---

## 👤 Author

**about-vann**

Built as a clean starting point for developers who want to create their own WhatsApp bot.

---

> **Base only. Build your own bot.**
