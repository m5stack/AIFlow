import {
  FaArrowRightLong,
  FaArrowUp,
  FaBolt,
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCode,
  FaComment,
  FaDatabase,
  FaEraser,
  FaFolder,
  FaGear,
  FaLightbulb,
  FaList,
  FaMobileScreen,
  FaMoon,
  FaPen,
  FaPlay,
  FaPlus,
  FaCircleQuestion,
  FaStop,
  FaSun,
  FaTrash,
  FaXmark
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'

export interface IconProps {
  className?: string
  size?: number
}

function icon(IconComponent: IconType, defaultSize = 16) {
  return ({ className = '', size = defaultSize }: IconProps) => (
    <IconComponent className={className} size={size} aria-hidden />
  )
}

export const FolderIcon = icon(FaFolder)
export const ChevronDownIcon = icon(FaChevronDown)
export const ChevronLeftIcon = icon(FaChevronLeft)
export const ChevronRightIcon = icon(FaChevronRight)
export const ArrowRightIcon = icon(FaArrowRightLong)
export const SettingsIcon = icon(FaGear, 20)
export const PlayIcon = icon(FaPlay)
export const StopIcon = icon(FaStop)
export const ClearTerminalIcon = icon(FaEraser)
export const ChatBubbleIcon = icon(FaComment)
export const SendIcon = icon(FaArrowUp)
export const PlusIcon = icon(FaPlus)
export const CloseIcon = icon(FaXmark)
export const SparklesIcon = ({ className = '', size = 16 }: IconProps) => (
  <FaBolt className={`text-white ${className}`} size={size} aria-hidden />
)
export const LightbulbIcon = icon(FaLightbulb)
export const QuestionCircleIcon = icon(FaCircleQuestion)
export const ListIcon = icon(FaList)
export const ZapIcon = icon(FaBolt)
export const EditIcon = icon(FaPen)
export const TrashIcon = icon(FaTrash)
export const CodeIcon = icon(FaCode)
export const DeviceIcon = icon(FaMobileScreen)
export const CheckIcon = icon(FaCheck)
export const DatabaseIcon = icon(FaDatabase)
export const SunIcon = icon(FaSun)
export const MoonIcon = icon(FaMoon)
