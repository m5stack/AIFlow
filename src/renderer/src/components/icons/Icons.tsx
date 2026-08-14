import {
  FaArrowRightLong,
  FaArrowUp,
  FaArrowsRotate,
  FaBolt,
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChartColumn,
  FaCode,
  FaComment,
  FaDatabase,
  FaDownload,
  FaEraser,
  FaEye,
  FaEyeSlash,
  FaFolder,
  FaGear,
  FaImage,
  FaLightbulb,
  FaList,
  FaMobileScreen,
  FaMoon,
  FaPen,
  FaPlay,
  FaPlug,
  FaPlus,
  FaCircleQuestion,
  FaStop,
  FaSun,
  FaTrash,
  FaWandMagicSparkles,
  FaXmark
} from 'react-icons/fa6'
import { HiOutlineRocketLaunch } from 'react-icons/hi2'
import type { IconType } from 'react-icons'
import type { FC, JSX } from 'react'

export interface IconProps {
  className?: string
  size?: number
}

function icon(IconComponent: IconType, defaultSize = 16): FC<IconProps> {
  return function WrappedIcon({ className = '', size = defaultSize }: IconProps): JSX.Element {
    return <IconComponent className={className} size={size} aria-hidden />
  }
}

export const RefreshIcon = icon(FaArrowsRotate)
export const EyeIcon = icon(FaEye)
export const EyeSlashIcon = icon(FaEyeSlash)
export const DownloadIcon = icon(FaDownload)
export const FolderIcon = icon(FaFolder)
export const ChevronDownIcon = icon(FaChevronDown)
export const ChevronLeftIcon = icon(FaChevronLeft)
export const ChevronRightIcon = icon(FaChevronRight)
export const ArrowRightIcon = icon(FaArrowRightLong)
export const SettingsIcon = icon(FaGear, 20)
export const PlayIcon = icon(FaPlay)
export const StartupFileIcon = icon(HiOutlineRocketLaunch)
export const StopIcon = icon(FaStop)
export const ClearTerminalIcon = icon(FaEraser)
export const ChatBubbleIcon = icon(FaComment)
export const SendIcon = icon(FaArrowUp)
export const PlusIcon = icon(FaPlus)
export const CloseIcon = icon(FaXmark)
export const SparklesIcon = ({ className = '', size = 16 }: IconProps): JSX.Element => (
  <FaBolt className={`text-white ${className}`} size={size} aria-hidden />
)
export const SkillIcon = icon(FaWandMagicSparkles)
export const McpIcon = icon(FaPlug)
export const LightbulbIcon = icon(FaLightbulb)
export const QuestionCircleIcon = icon(FaCircleQuestion)
export const ListIcon = icon(FaList)
export const ZapIcon = icon(FaBolt)
export const EditIcon = icon(FaPen)
export const TrashIcon = icon(FaTrash)
export const ChartIcon = icon(FaChartColumn)
export const CodeIcon = icon(FaCode)
export const ImageIcon = icon(FaImage)
export const DeviceIcon = icon(FaMobileScreen)
export const CheckIcon = icon(FaCheck)
export const DatabaseIcon = icon(FaDatabase)
export const SunIcon = icon(FaSun)
export const MoonIcon = icon(FaMoon)
