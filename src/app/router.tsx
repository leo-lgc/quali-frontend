import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AppShell } from '../layouts/AppShell'
import { ClientsPage } from '../pages/ClientsPage'
import { LoginPage } from '../pages/LoginPage'
import { ConstructionsPage } from '../pages/ConstructionsPage'
import { ConstructionDetailPage } from '../pages/ConstructionDetailPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/obras" replace />} />
        <Route path="/obras" element={<ConstructionsPage />} />
        <Route path="/obras/:constructionId" element={<ConstructionDetailPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
