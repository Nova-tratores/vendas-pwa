import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Clientes from './pages/Clientes'
import Propriedades from './pages/Propriedades'
import Pessoas from './pages/Pessoas'
import Maquinas from './pages/Maquinas'
import Visitas from './pages/Visitas'
import Negocios from './pages/Negocios'
import Dashboard from './pages/Dashboard'
import Catalogo from './pages/Catalogo'
import CatalogoDetalhe from './pages/CatalogoDetalhe'
import Showroom from './pages/Showroom'
import Agenda from './pages/Agenda'
import MapaClientes from './pages/MapaClientes'
import VisitasMapa from './pages/VisitasMapa'
import VisitasCliente from './pages/VisitasCliente'
import ChamadoVeicular from './pages/ChamadoVeicular'
import Notificacoes from './pages/Notificacoes'

// Supervisor
import SupervisorLogin from './supervisor/SupervisorLogin'
import SupervisorLayout from './supervisor/SupervisorLayout'
import SupervisorOverview from './supervisor/SupervisorOverview'
import SupervisorVendedores from './supervisor/SupervisorVendedores'
import SupervisorEvolucao from './supervisor/SupervisorEvolucao'
import SupervisorVisitas from './supervisor/SupervisorVisitas'
import SupervisorPosVendas from './supervisor/SupervisorPosVendas'
import SupervisorAlertas from './supervisor/SupervisorAlertas'
import SupervisorProdutos from './supervisor/SupervisorProdutos'
import SupervisorCatalogo from './supervisor/SupervisorCatalogo'
import SupervisorConfig from './supervisor/SupervisorConfig'
import SupervisorMapa from './supervisor/SupervisorMapa'
import SupervisorClientes from './supervisor/SupervisorClientes'
import SupervisorCidades from './supervisor/SupervisorCidades'
import SupervisorNotificacoes from './supervisor/SupervisorNotificacoes'
import SupervisorSemana from './supervisor/SupervisorSemana'
import SupervisorPropostas from './supervisor/SupervisorPropostas'
import SupervisorCompartilhamentos from './supervisor/SupervisorCompartilhamentos'
import SupervisorMaisVendidas from './supervisor/SupervisorMaisVendidas'

function ProtectedRoute({ children }) {
  const vendedor = localStorage.getItem('vendedor')
  if (!vendedor) return <Navigate to="/login" replace />
  return children
}

function SupervisorRoute({ children }) {
  const supervisor = localStorage.getItem('supervisor')
  if (!supervisor) return <Navigate to="/supervisor/login" replace />
  return children
}

// Showroom em tela cheia (kiosk): fora do Layout, aceita vendedor OU supervisor logado.
function ShowroomRoute({ children }) {
  const logado = localStorage.getItem('vendedor') || localStorage.getItem('supervisor')
  if (!logado) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Vendedor */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Showroom / TV (tela cheia, sem o chrome do Layout) */}
      <Route
        path="/showroom"
        element={
          <ShowroomRoute>
            <Showroom />
          </ShowroomRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="propriedades/:clienteId" element={<Propriedades />} />
        <Route path="pessoas/:propriedadeId" element={<Pessoas />} />
        <Route path="maquinas/:propriedadeId" element={<Maquinas />} />
        <Route path="visitas" element={<Visitas />} />
        <Route path="visitas/mapa" element={<VisitasMapa />} />
        <Route path="historico-visitas/:propriedadeId" element={<VisitasCliente />} />
        <Route path="chamado-veicular" element={<ChamadoVeicular />} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="negocios" element={<Negocios />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="catalogo/:id" element={<CatalogoDetalhe />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="mapa" element={<MapaClientes />} />
      </Route>

      {/* Supervisor */}
      <Route path="/supervisor/login" element={<SupervisorLogin />} />
      <Route
        path="/supervisor"
        element={
          <SupervisorRoute>
            <SupervisorLayout />
          </SupervisorRoute>
        }
      >
        <Route index element={<SupervisorOverview />} />
        <Route path="vendedores" element={<SupervisorVendedores />} />
        <Route path="clientes" element={<SupervisorClientes />} />
        <Route path="cidades" element={<SupervisorCidades />} />
        <Route path="notificacoes" element={<SupervisorNotificacoes />} />
        <Route path="evolucao" element={<SupervisorEvolucao />} />
        <Route path="visitas" element={<SupervisorVisitas />} />
        <Route path="semana" element={<SupervisorSemana />} />
        <Route path="propostas" element={<SupervisorPropostas />} />
        <Route path="pos-vendas" element={<SupervisorPosVendas />} />
        <Route path="alertas" element={<SupervisorAlertas />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="catalogo/:id" element={<CatalogoDetalhe />} />
        <Route path="catalogo-admin" element={<SupervisorCatalogo />} />
        <Route path="mais-vendidas" element={<SupervisorMaisVendidas />} />
        <Route path="produtos" element={<SupervisorProdutos />} />
        <Route path="compartilhamentos" element={<SupervisorCompartilhamentos />} />
        <Route path="config" element={<SupervisorConfig />} />
        <Route path="mapa" element={<SupervisorMapa />} />
      </Route>
    </Routes>
  )
}
