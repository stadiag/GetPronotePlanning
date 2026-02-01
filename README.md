# 📚 GetPronotePlanning

Un petit outil Node.js pour **exporter votre emploi du temps Pronote** grâce à un QR code.  
A small Node.js tool to **export your Pronote timetable** using a QR code.

---

## 🇫🇷 Français

### ✨ Fonctionnalités
- 🔐 Connexion via QR Pronote
- 📆 Récupération de l’emploi du temps
- 🧩 Basé sur la librairie `pawnote`

### ✅ Prérequis
- Node.js ≥ 16
- Un QR Pronote valide

### ⚙️ Installation
```bash
npm install
```

### 🚀 Utilisation
1. Copie `qr.json.example` vers `qr.json`
2. Colle les champs `jeton`, `login` et `url`
3. Lance le script :

```bash
node export-timetable.js
```

👉 Tu peux aussi définir le QR directement via la variable d’environnement :
```bash
export PRONOTE_QR_JSON='{"avecPageConnexion":false,"jeton":"...","login":"...","url":"..."}'
```

### 🔑 PIN
Le script peut demander un **PIN Pronote** (4 chiffres).  
Tu peux le passer via :
```bash
export PRONOTE_PIN="1234"
```

### 📝 Notes
- Le QR Pronote peut expirer : régénère-le si besoin.
- Le script affiche des erreurs claires en cas de problème (PIN, token, serveur, etc.).

---

## 🇬🇧 English

### ✨ Features
- 🔐 QR-based Pronote login
- 📆 Timetable export
- 🧩 Powered by `pawnote`

### ✅ Requirements
- Node.js ≥ 16
- A valid Pronote QR

### ⚙️ Install
```bash
npm install
```

### 🚀 Usage
1. Copy `qr.json.example` to `qr.json`
2. Paste the `jeton`, `login`, and `url` fields
3. Run the script:

```bash
node export-timetable.js
```

👉 You can also provide the QR via env var:
```bash
export PRONOTE_QR_JSON='{"avecPageConnexion":false,"jeton":"...","login":"...","url":"..."}'
```

### 🔑 PIN
The script may ask for a **Pronote PIN** (4 digits).  
You can provide it via:
```bash
export PRONOTE_PIN="1234"
```

### 📝 Notes
- QR codes can expire: regenerate if needed.
- The script provides clear error messages for common failures.

---

## 📜 License
ISC