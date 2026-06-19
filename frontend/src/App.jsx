import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import AuthPage from './pages/AuthPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<EventsPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute>
                  <EventDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
