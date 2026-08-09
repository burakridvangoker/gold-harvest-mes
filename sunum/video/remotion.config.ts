/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);

/*
 * Bu ortam Remotion'ın kendi Chrome'unu indiremiyor (remotion.media ağ
 * izin listesinde değil), ama Playwright'ın chrome-headless-shell'i hazır
 * kurulu. Remotion yeni headless moduyla çalışmadığı için doğrudan
 * headless_shell ikilisi veriliyor.
 *
 * Başka bir makinede bu yol yoksa satırı kaldırın; Remotion kendi
 * tarayıcısını indirip kullanır.
 */
const HEADLESS_SHELL =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (require("fs").existsSync(HEADLESS_SHELL)) {
  Config.setBrowserExecutable(HEADLESS_SHELL);
}
