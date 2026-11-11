// Rendert film.html Bild für Bild im Browser und übergibt die Bilder an ffmpeg.
//   node render.js            -> out/dnp-preisverleihung.mp4 (stumm, 1080p, H.264)
//   node render.js 60,200,430 -> nur diese Einzelbilder als PNG nach out/ (zur Kontrolle)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const { once } = require("events");
const fs = require("fs");
const path = require("path");
const ci = require("../../branding/feind-ci.tokens.json");
const TEXTE = require("./texte.js");

const CLOUD_BROWSER = "/opt/pw-browsers/chromium";

(async () => {
  const aus = path.join(__dirname, "out");
  fs.mkdirSync(aus, { recursive: true });
  const browser = await chromium.launch(fs.existsSync(CLOUD_BROWSER) ? { executablePath: CLOUD_BROWSER } : {});
  const seite = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await seite.goto("file://" + path.join(__dirname, "film.html"));
  const ende = await seite.evaluate(async ([ci, T]) => {
    await document.fonts.load("900 100px Exo");
    // Ohne Exo oder mit fehlendem Foto wäre der Film nicht CI-konform – lieber abbrechen.
    if (!document.fonts.check("900 100px Exo")) throw new Error("Schrift Exo fehlt – erst `npm install` ausführen");
    await Promise.all([...document.images].map((i) => i.decode()));
    return start(ci, T);
  }, [ci, TEXTE]);
  const foto = async (f) => {
    await seite.evaluate((f) => bild(f), f);
    return seite.screenshot({ type: "png" });
  };

  if (process.argv[2]) {
    for (const f of process.argv[2].split(",").map(Number)) fs.writeFileSync(path.join(aus, `f${f}.png`), await foto(f));
  } else {
    const ziel = path.join(aus, "dnp-preisverleihung.mp4");
    const ffmpeg = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-c:v", "png", "-i", "-",
      "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
      "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-movflags", "+faststart", ziel], { stdio: ["pipe", "inherit", "inherit"] });
    for (let f = 0; f < ende; f++) {
      if (!ffmpeg.stdin.write(await foto(f))) await once(ffmpeg.stdin, "drain");
    }
    ffmpeg.stdin.end();
    const [code] = await once(ffmpeg, "close");
    if (code !== 0) throw new Error("ffmpeg ist fehlgeschlagen");
    console.log("fertig:", ziel);
  }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
