import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import Accessories from '@/pages/Accessories'
import Bazar from '@/pages/Bazar'
import Bills from '@/pages/Bills'
import Login from '@/pages/Login'
import Meals from '@/pages/Meals'
import Members from '@/pages/Members'
import Summary from '@/pages/Summary'
import Users from '@/pages/Users'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AuthLayout />}>
          <Route index element={<Navigate to="/summary" replace />} />
          <Route path="bazar" element={<Bazar />} />
          <Route path="meals" element={<Meals />} />
          <Route path="accessories" element={<Accessories />} />
          <Route path="bills" element={<Bills />} />
          <Route path="summary" element={<Summary />} />
          <Route path="members" element={<Members />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}