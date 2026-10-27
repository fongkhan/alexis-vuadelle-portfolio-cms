import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function logWebhook(message: string): void {
  const entry = `[${new Date().toISOString()}] ${message}\n`
  console.log(entry.trim())
  try {
    fs.appendFileSync(path.resolve(process.cwd(), 'webhook.log'), entry, 'utf8')
  } catch {
    // Ignore file logging errors
  }
}

function triggerLocalBuildScriptFallback(): boolean {
  const scriptPath = process.env.BUILD_SCRIPT_PATH || '/home/fongkhan/build_astro.sh'
  const logPath = process.env.BUILD_LOG_PATH || '/home/fongkhan/build_astro_webhook.log'

  try {
    if (!fs.existsSync(scriptPath)) {
      return false
    }
    const out = fs.openSync(logPath, 'a')
    fs.writeSync(
      out,
      `[${new Date().toISOString()}] Rebuild déclenché directement par Payload CMS (fallback local).\n`,
    )
    const child = spawn('bash', [scriptPath], {
      detached: true,
      stdio: ['ignore', out, out],
    })
    child.unref()
    logWebhook(`Fallback local exécuté avec succès : bash ${scriptPath}`)
    return true
  } catch (err) {
    logWebhook(`Échec du fallback local (${scriptPath}) : ${String(err)}`)
    return false
  }
}

async function executeWebhook(): Promise<void> {
  const secretToken = process.env.WEBHOOK_SECRET || 'MY_SUPER_SECRET_TOKEN_2026'
  const webhookBaseUrl =
    process.env.WEBHOOK_URL || 'https://alexis-vuadelle.com/webhook-payload.php'
  const url = `${webhookBaseUrl}?token=${encodeURIComponent(secretToken)}`

  try {
    logWebhook(`Appel du webhook : ${webhookBaseUrl}`)
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const bodyText = await res.text().catch(() => '')
    if (!res.ok) {
      logWebhook(
        `Webhook HTTP en échec (${res.status} ${res.statusText}) : ${bodyText}`,
      )
      triggerLocalBuildScriptFallback()
    } else {
      logWebhook(`Webhook HTTP déclenché avec succès (${res.status}) : ${bodyText.trim()}`)
    }
  } catch (err) {
    logWebhook(`Erreur réseau lors de l'appel au webhook HTTP : ${String(err)}`)
    triggerLocalBuildScriptFallback()
  }
}

export const triggerWebhook = async () => {
  if (process.env.DISABLE_WEBHOOK === 'true') {
    return
  }

  // Debounce by 1.5s to avoid launching multiple concurrent Astro builds on rapid saves
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void executeWebhook()
  }, 1500)
}
