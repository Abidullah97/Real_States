import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Bath,
  BedDouble,
  Bell,
  BellRing,
  Briefcase,
  Building2,
  Calendar,
  CarFront,
  ChartColumn,
  ChartPie,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  ClipboardList,
  Clock,
  Compass,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Globe,
  GripVertical,
  Heart,
  House,
  Image,
  Images,
  Inbox,
  Info,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  List,
  LogIn,
  LogOut,
  Mail,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Maximize,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  ScrollText,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tags,
  Trash2,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string; absoluteStrokeWidth?: boolean }>;

/** Name-based access to Lucide icons so call sites stay readable and the set stays curated. */
const icons: Record<string, LucideIcon> = {
  activity: Activity,
  alert: CircleAlert,
  archive: Archive,
  area: Maximize,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  ban: Ban,
  bath: Bath,
  bed: BedDouble,
  bell: Bell,
  "bell-ring": BellRing,
  briefcase: Briefcase,
  building: Building2,
  calendar: Calendar,
  car: CarFront,
  chart: ChartColumn,
  "chart-pie": ChartPie,
  check: Check,
  "check-all": CheckCheck,
  "check-circle": CircleCheck,
  "check-big": CircleCheckBig,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  clipboard: ClipboardList,
  clock: Clock,
  close: X,
  compass: Compass,
  dashboard: LayoutDashboard,
  download: Download,
  edit: Pencil,
  external: ExternalLink,
  eye: Eye,
  "eye-off": EyeOff,
  file: FileText,
  filter: Filter,
  globe: Globe,
  grip: GripVertical,
  grid: LayoutGrid,
  heart: Heart,
  home: House,
  image: Image,
  images: Images,
  inbox: Inbox,
  info: Info,
  key: KeyRound,
  layers: Layers,
  list: List,
  login: LogIn,
  logout: LogOut,
  mail: Mail,
  map: MapIcon,
  "map-pinned": MapPinned,
  menu: Menu,
  message: MessageSquare,
  more: Ellipsis,
  "panel-close": PanelLeftClose,
  "panel-open": PanelLeftOpen,
  phone: Phone,
  pin: MapPin,
  plus: Plus,
  restore: RotateCcw,
  scroll: ScrollText,
  search: Search,
  settings: Settings,
  share: Share2,
  shield: ShieldCheck,
  sliders: SlidersHorizontal,
  sparkle: Sparkles,
  star: Star,
  tags: Tags,
  trash: Trash2,
  trending: TrendingUp,
  upload: Upload,
  user: User,
  "user-check": UserCheck,
  "user-plus": UserPlus,
  "user-x": UserX,
  users: Users,
  x: X,
};

/** Lucide v1 no longer ships brand marks, so social icons keep simple custom paths. */
const brands: Record<string, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.8h.01" />
    </>
  ),
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2.5H7.5v4H10V21h4v-6.5h3l.5-4H14V8.5a.5.5 0 0 1 .5-.5Z" />,
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M8 10.5V16M8 7.5h.01M11.5 16v-5.5M11.5 13a2.5 2.5 0 0 1 5 0v3" />
    </>
  ),
};

export function Icon({ name, size = 18, strokeWidth = 1.75, className }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const Component = icons[name];
  if (Component) return <Component size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" focusable="false" />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {brands[name]}
    </svg>
  );
}
