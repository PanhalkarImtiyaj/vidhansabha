import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import AuthPage from './components/AuthPage'
import DashboardLayout from './components/DashboardLayout'

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <DashboardLayout />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
