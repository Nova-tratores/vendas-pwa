// Ícones do app (lucide-react, a mesma biblioteca do Portal) — no lugar de emojis.
//
// Uso direto em JSX: importe o ícone de 'lucide-react' e use <MapPin size={16} />.
// Quando o ícone vem de DADOS (listas, ajuda, notificações), guarde o NOME e use
// <Icone nome="MapPin" size={16} />. Só os nomes listados abaixo existem; nome
// desconhecido não desenha nada.
import {
  ArrowLeftRight, ArrowRight, BadgePercent, Ban, Banknote, Beef, Bell, Bike, Briefcase, Building2,
  Calculator, Calendar, Camera, Car, ChartColumn, ChevronRight, Citrus, CircleCheck, CircleHelp, CircleX,
  Clapperboard, ClipboardList, Clock, Cloud, CloudRain, CloudSunRain, Coffee, Compass, DollarSign, DoorOpen,
  Droplet, ExternalLink, Eye, Factory, FileText, Flag, FlaskConical, FolderOpen, Fuel, Gauge,
  Globe, Hand, Handshake, Hourglass, House, Image, KeyRound, Landmark, Leaf, Lightbulb,
  Lock, Map, MapPin, MapPinOff, Megaphone, MessageCircle, Mic, Minus, Navigation, Newspaper,
  Package, PawPrint, Pencil, Percent, Phone, Play, Plus, Printer, Radio, RefreshCw,
  Repeat, Rocket, RotateCcw, Salad, Satellite, Scale, Search, Settings, Shield, Shuffle,
  Smartphone, Sparkles, Sprout, Star, Store, Sun, Swords, Target, Thermometer, Tractor,
  Trash2, TrendingDown, TrendingUp, TriangleAlert, Truck, User, UserX, Users, Video, Wallet,
  Warehouse, Wheat, Wifi, Wrench,
} from 'lucide-react'

export const ICONES = {
  ArrowLeftRight, ArrowRight, BadgePercent, Ban, Banknote, Beef, Bell, Bike, Briefcase, Building2,
  Calculator, Calendar, Camera, Car, ChartColumn, ChevronRight, Citrus, CircleCheck, CircleHelp, CircleX,
  Clapperboard, ClipboardList, Clock, Cloud, CloudRain, CloudSunRain, Coffee, Compass, DollarSign, DoorOpen,
  Droplet, ExternalLink, Eye, Factory, FileText, Flag, FlaskConical, FolderOpen, Fuel, Gauge,
  Globe, Hand, Handshake, Hourglass, House, Image, KeyRound, Landmark, Leaf, Lightbulb,
  Lock, Map, MapPin, MapPinOff, Megaphone, MessageCircle, Mic, Minus, Navigation, Newspaper,
  Package, PawPrint, Pencil, Percent, Phone, Play, Plus, Printer, Radio, RefreshCw,
  Repeat, Rocket, RotateCcw, Salad, Satellite, Scale, Search, Settings, Shield, Shuffle,
  Smartphone, Sparkles, Sprout, Star, Store, Sun, Swords, Target, Thermometer, Tractor,
  Trash2, TrendingDown, TrendingUp, TriangleAlert, Truck, User, UserX, Users, Video, Wallet,
  Warehouse, Wheat, Wifi, Wrench,
}

// Emojis que ainda vêm do BANCO (ex.: catalogo_cultivos.icone) → nome do ícone.
// Escritos como \u{...} para não haver emoji no código.
const DO_EMOJI = {
  '\u{1F33E}': 'Wheat', '\u2615': 'Coffee', '\u{1F38B}': 'Leaf', '\u2601': 'Cloud',
  '\u{1F404}': 'Beef', '\u{1F96C}': 'Salad', '\u{1F34A}': 'Citrus', '\u{1F33D}': 'Wheat',
  '\u{1F331}': 'Sprout', '\u{1F69C}': 'Tractor',
}

/** Nome do ícone para um valor que pode ser nome lucide ou emoji antigo; senão null. */
export function nomeDoIcone(valor) {
  if (!valor) return null
  if (ICONES[valor]) return valor
  return DO_EMOJI[String(valor).replace(/\uFE0F/g, '').trim()] || null
}

export default function Icone({ nome, size = 16, className = '', ...resto }) {
  const C = ICONES[nomeDoIcone(nome)]
  if (!C) return null
  return <C size={size} className={`inline-block shrink-0 ${className}`} aria-hidden="true" {...resto} />
}
