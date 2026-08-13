import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/latin.css'
import '@fontsource/ibm-plex-sans/latin-ext.css'
import '@fontsource/saira-condensed/latin.css'
import '@fontsource/saira-condensed/latin-ext.css'
import '../../src/index.css'
import '../../src/styles/andon.css'
import OperatorPanel from '../../src/pages/OperatorPanel.jsx'
import ManagerDashboard from '../../src/pages/ManagerDashboard.jsx'
import SevkiyatPanel from '../../src/pages/SevkiyatPanel.jsx'
import VeriGirisiPanel from '../../src/pages/VeriGirisiPanel.jsx'
import Sahne from './Sahne.jsx'
import './sade.css'

/* ?ekran=operator | mudur | sevkiyat | veri-girisi | sahne — StrictMode
 * yok (çift efekt çağrısı ekran görüntüsünde/videoda gereksiz gürültü
 * yaratıyor). ?sade=1 — video sahnesindeki telefon kadrajı için ikincil
 * bölümleri gizler (bkz. sade.css). */
const parametreler = new URLSearchParams(window.location.search)
const ekran = parametreler.get('ekran')
if (parametreler.get('sade')) document.body.classList.add('sade')
if (parametreler.get('video')) document.body.classList.add('video')

const secilen =
  ekran === 'mudur' ? (
    <ManagerDashboard />
  ) : ekran === 'sevkiyat' ? (
    <SevkiyatPanel />
  ) : ekran === 'veri-girisi' ? (
    <VeriGirisiPanel />
  ) : ekran === 'sahne' ? (
    <Sahne />
  ) : (
    <OperatorPanel />
  )

createRoot(document.getElementById('root')).render(secilen)
