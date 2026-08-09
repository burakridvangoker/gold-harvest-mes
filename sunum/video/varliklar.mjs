/*
 * sunum/fonts ve sunum/gorseller → video/public/ kopyalar.
 *
 * Remotion yalnızca kendi public/ klasöründen varlık okuyabildiği için
 * (staticFile) bu kopya ZORUNLU. Bedeli: uygulama arayüzü değişip
 * `node sunum/uretim/shots.cjs` yeniden çalıştırıldığında buradaki
 * kopyalar SESSİZCE bayatlar — video kaldırılmış bir özelliği göstermeye
 * devam eder. Bu betik tek komutla eşitler:
 *
 *     npm run varliklar
 *
 * Render'dan önce çalıştırın.
 */
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const burasi = dirname(fileURLToPath(import.meta.url));
const sunum = join(burasi, "..");

for (const klasor of ["fonts", "gorseller"]) {
  const hedef = join(burasi, "public", klasor);
  mkdirSync(hedef, { recursive: true });
  cpSync(join(sunum, klasor), hedef, { recursive: true });
  console.log(`✓ ${klasor} eşitlendi`);
}
