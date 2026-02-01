const {
  createSessionHandle,
  loginQrCode,
  loginToken,
  AccountKind,
  timetableFromWeek,
  translateToWeekNumber,
  parseTimetable,
  BadCredentialsError,
  SecurityError,
  SuspendedIPError,
  BusyPageError,
  PageUnavailableError,
  AccessDeniedError,
  AccountDisabledError,
  SessionExpiredError,
  AuthenticateError,
  RateLimitedError,
  ServerSideError,
} = require("pawnote");
const fs = require("fs");
const os = require("os");
const readline = require("readline");

const AUTH_PATH = "auth.json";
const QR_PATH = "qr.json";

function fileExists(path) {
  try {
    fs.accessSync(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function loadJsonFile(path) {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await new Promise(resolve => rl.question(question, resolve));
  } finally {
    rl.close();
  }
}

async function getPin() {
  const fromEnv = (process.env.PRONOTE_PIN || "").trim();
  if (fromEnv) return fromEnv;
  return (await prompt("PIN Pronote (4 chiffres) : ")).trim();
}

function loadQr() {
  const fromEnv = (process.env.PRONOTE_QR_JSON || "").trim();
  if (fromEnv) return JSON.parse(fromEnv);
  if (fileExists(QR_PATH)) return loadJsonFile(QR_PATH);
  throw new Error(
    `QR introuvable. Crée '${QR_PATH}' (ou utilise PRONOTE_QR_JSON) avec le JSON du QR Pronote.`
  );
}

function defaultDeviceUUID() {
  return `pronoteplanner-${os.hostname()}`;
}

function mask(value, keepStart = 4, keepEnd = 4) {
  if (!value || typeof value !== "string") return "(none)";
  if (value.length <= keepStart + keepEnd) return "(hidden)";
  return `${value.slice(0, keepStart)}…${value.slice(-keepEnd)}`;
}

function explainAuthError(err) {
  if (err instanceof BadCredentialsError) {
    return [
      "Identifiants/jeton invalides.",
      "Causes les plus fréquentes :",
      "- PIN incorrect (le PIN n'est pas forcément 0000)",
      "- QR expiré / déjà utilisé / mal copié",
      "- token sauvegardé devenu invalide",
    ].join("\n");
  }
  if (err instanceof SecurityError) {
    return [
      "Pronote demande une sécurisation supplémentaire (double auth / PIN / nom d'appareil).",
      "Il faut gérer la procédure de sécurité (le lib peut demander une action).",
    ].join("\n");
  }
  if (err instanceof SuspendedIPError) return "Adresse IP provisoirement suspendue par Pronote.";
  if (err instanceof BusyPageError) return "Serveur Pronote indisponible temporairement (réessaie plus tard).";
  if (err instanceof PageUnavailableError) return "Page/URL Pronote indisponible (mauvaise URL ou espace).";
  if (err instanceof AccessDeniedError) return "Accès refusé (mauvais espace ou droits insuffisants).";
  if (err instanceof AccountDisabledError) return "Compte désactivé.";
  if (err instanceof SessionExpiredError) return "Session expirée (réessaie).";
  if (err instanceof AuthenticateError) return `Erreur d'authentification : ${err.message}`;
  if (err instanceof RateLimitedError) return "Trop de requêtes (rate-limited). Attends un peu.";
  if (err instanceof ServerSideError) return `Erreur serveur Pronote : ${err.message}`;
  return null;
}

(async () => {
  const deviceUUID = (process.env.PRONOTE_DEVICE_UUID || "").trim() || defaultDeviceUUID();
  const session = createSessionHandle();

  const pin = await getPin();
  if (!/^\d{4}$/.test(pin)) {
    console.error("PIN invalide : il doit contenir exactement 4 chiffres.");
    process.exit(1);
  }

  // 1) Essaie d'abord via token sauvegardé (évite de rescanner le QR)
  let authed = false;
  if (fileExists(AUTH_PATH)) {
    try {
      const saved = loadJsonFile(AUTH_PATH);
      await loginToken(session, {
        url: saved.url,
        kind: saved.kind ?? AccountKind.STUDENT,
        username: saved.username,
        token: saved.token,
        deviceUUID: saved.deviceUUID || deviceUUID,
      });
      authed = true;
      console.log(`✅ Connecté via token sauvegardé (${AUTH_PATH}).`);
    } catch (err) {
      console.warn("⚠️  Échec token sauvegardé, fallback sur QR.");
      const msg = explainAuthError(err);
      if (msg) console.warn(msg);
    }
  }

  // 2) Sinon login via QR
  if (!authed) {
    const qr = loadQr();
    try {
      const refresh = await loginQrCode(session, {
        qr,
        pin,
        deviceUUID,
      });

      // Sauvegarde les infos pour les prochains runs
      if (refresh?.token && refresh?.username && refresh?.url) {
        fs.writeFileSync(
          AUTH_PATH,
          JSON.stringify(
            {
              url: refresh.url,
              kind: refresh.kind ?? AccountKind.STUDENT,
              username: refresh.username,
              token: refresh.token,
              deviceUUID,
              createdAt: new Date().toISOString(),
            },
            null,
            2
          ),
          "utf-8"
        );
        console.log(`✅ Token sauvegardé dans ${AUTH_PATH} (token=${mask(refresh.token)}).`);
      }

      authed = true;
    } catch (err) {
      const msg = explainAuthError(err);
      console.error(msg || err);
      process.exit(1);
    }
  }

  const today = new Date();
  const weekNumber = translateToWeekNumber(today, session.instance.firstMonday);

  const timetable = await timetableFromWeek(session, weekNumber);
  parseTimetable(session, timetable, {
    withSuperposedCanceledClasses: false,
    withCanceledClasses: true,
    withPlannedClasses: true,
  });

  const data = timetable.classes.map(c => ({
    subject: c.subject?.name,
    teacher: c.teacher?.name,
    room: c.room?.name,
    start: c.startDate,
    end: c.endDate,
    isCancelled: c.canceled ?? false,
  }));

  fs.writeFileSync("timetable.json", JSON.stringify(data, null, 2), "utf-8");
  console.log("✅ Export terminé → timetable.json");
})();