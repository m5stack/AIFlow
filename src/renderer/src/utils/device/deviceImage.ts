import { DEVICE_TYPE, normalizeDeviceTypeForPinMap } from '../../../../shared/deviceInfo'
import imgUnknown from '../../assets/device/unknown.svg'
import imgAirQ from '../../assets/device/airq.png'
import imgAtomEcho from '../../assets/device/atom-echo.png'
import imgAtomEchoS3R from '../../assets/device/atom-echos3r.png'
import imgAtomLite from '../../assets/device/atom-lite.png'
import imgAtomMatrix from '../../assets/device/atom-matrix.png'
import imgAtomU from '../../assets/device/atom-u.png'
import imgAtoms3 from '../../assets/device/atoms3.png'
import imgAtoms3Lite from '../../assets/device/atoms3-lite.png'
import imgAtoms3R from '../../assets/device/atoms3r.png'
import imgAtoms3RCam from '../../assets/device/atoms3r-cam.png'
import imgAtoms3U from '../../assets/device/atoms3u.png'
import imgCardputer from '../../assets/device/cardputer.png'
import imgCardputerAdv from '../../assets/device/cardputer-adv.png'
import imgCore from '../../assets/device/core.png'
import imgCore2 from '../../assets/device/core2.png'
import imgCoreInk from '../../assets/device/coreink.png'
import imgCoreMp135 from '../../assets/device/coremp135.png'
import imgCoreS3 from '../../assets/device/cores3.png'
import imgDial from '../../assets/device/dial.png'
import imgDinmeter from '../../assets/device/dinmeter.png'
import imgDualkey from '../../assets/device/dualkey.png'
import imgEsp32S3Box3 from '../../assets/device/esp32-s3-box3.png'
import imgFire from '../../assets/device/fire.png'
import imgM5Capsule from '../../assets/device/m5capsule.png'
import imgNanoC6 from '../../assets/device/nanoc6.png'
import imgNessoN1 from '../../assets/device/nesso_n1.png'
import imgPaper from '../../assets/device/paper.png'
import imgPaperColor from '../../assets/device/papercolor.png'
import imgPaperS3 from '../../assets/device/papers3.png'
import imgPowerHub from '../../assets/device/powerhub.png'
import imgSeeedXiaoEsp32S3 from '../../assets/device/seeedstudio-xiao-esp32s3.png'
import imgStackChan from '../../assets/device/stackchan.png'
import imgStampP4 from '../../assets/device/stamp-p4.png'
import imgStampPico from '../../assets/device/stamp-pico.png'
import imgStampS3Bat from '../../assets/device/stamp-s3bat.png'
import imgStampLc from '../../assets/device/stamplc.png'
import imgStamps3 from '../../assets/device/stamps3.png'
import imgStation from '../../assets/device/station.png'
import imgStickC from '../../assets/device/stickc.png'
import imgStickCPlus from '../../assets/device/stickcplus.png'
import imgStickCPlus2 from '../../assets/device/stickcplus2.png'
import imgStickS3 from '../../assets/device/sticks3.png'
import imgStopwatch from '../../assets/device/stopwatch.png'
import imgTab5 from '../../assets/device/tab5.png'
import imgTough from '../../assets/device/tough.png'
import imgUnitC6L from '../../assets/device/unit-c6l.png'
import imgUnitPoeP4 from '../../assets/device/unit-poep4.png'

export { imgUnknown }

const MODEL_IMAGE: Record<string, string> = {
  [DEVICE_TYPE.ATOMS3]: imgAtoms3,
  [DEVICE_TYPE.ATOMS3_LITE]: imgAtoms3Lite,
  [DEVICE_TYPE.ATOMS3U]: imgAtoms3U,
  [DEVICE_TYPE.ATOMS3R]: imgAtoms3R,
  [DEVICE_TYPE.ATOMS3R_CAM]: imgAtoms3RCam,
  [DEVICE_TYPE.ATOM_ECHO_S3R]: imgAtomEchoS3R,
  [DEVICE_TYPE.STAMPS3]: imgStamps3,
  [DEVICE_TYPE.STAMPS3BAT]: imgStampS3Bat,
  [DEVICE_TYPE.CORES3]: imgCoreS3,
  [DEVICE_TYPE.STACKCHAN]: imgStackChan,
  [DEVICE_TYPE.CORE2]: imgCore2,
  [DEVICE_TYPE.TOUGH]: imgTough,
  [DEVICE_TYPE.FIRE]: imgFire,
  [DEVICE_TYPE.CORE]: imgCore,
  [DEVICE_TYPE.STICKC_PLUS]: imgStickCPlus,
  [DEVICE_TYPE.STICKC_PLUS2]: imgStickCPlus2,
  [DEVICE_TYPE.CAPSULE]: imgM5Capsule,
  [DEVICE_TYPE.DIAL]: imgDial,
  [DEVICE_TYPE.CARDPUTER]: imgCardputer,
  [DEVICE_TYPE.CARDPUTER_ADV]: imgCardputerAdv,
  [DEVICE_TYPE.AIRQ]: imgAirQ,
  [DEVICE_TYPE.COREINK]: imgCoreInk,
  [DEVICE_TYPE.DINMETER]: imgDinmeter,
  [DEVICE_TYPE.STATION]: imgStation,
  [DEVICE_TYPE.PAPER]: imgPaper,
  [DEVICE_TYPE.PAPERS3]: imgPaperS3,
  [DEVICE_TYPE.PAPER_COLOR]: imgPaperColor,
  [DEVICE_TYPE.STICKC]: imgStickC,
  [DEVICE_TYPE.STAMP_PICO]: imgStampPico,
  [DEVICE_TYPE.ATOMU]: imgAtomU,
  [DEVICE_TYPE.ATOM_LITE]: imgAtomLite,
  [DEVICE_TYPE.ATOM_MATRIX]: imgAtomMatrix,
  [DEVICE_TYPE.ATOM_ECHO]: imgAtomEcho,
  [DEVICE_TYPE.STAMPLC]: imgStampLc,
  [DEVICE_TYPE.POWERHUB]: imgPowerHub,
  [DEVICE_TYPE.DUALKEY]: imgDualkey,
  [DEVICE_TYPE.STOPWATCH]: imgStopwatch,
  [DEVICE_TYPE.NANOC6]: imgNanoC6,
  [DEVICE_TYPE.TAB5]: imgTab5,
  [DEVICE_TYPE.COREMP135]: imgCoreMp135,
  [DEVICE_TYPE.UNIT_C6L]: imgUnitC6L,
  [DEVICE_TYPE.STICKS3]: imgStickS3,
  [DEVICE_TYPE.UNIT_POE_P4]: imgUnitPoeP4,
  [DEVICE_TYPE.STAMP_P4]: imgStampP4,
  [DEVICE_TYPE.SEEED_XIAO_ESP32S3]: imgSeeedXiaoEsp32S3,
  [DEVICE_TYPE.ESP32S3_BOX3]: imgEsp32S3Box3,
  [DEVICE_TYPE.NESSO_N1]: imgNessoN1
}

export function resolveDeviceImage(model: string): string {
  const normalized = normalizeDeviceTypeForPinMap(model?.replace(/\s+v[\d.]+$/, '').trim() ?? '')
  return MODEL_IMAGE[normalized] ?? imgUnknown
}
