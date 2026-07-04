import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Requests from './pages/Requests';
import NewRequest from './pages/NewRequest';
import Files from './pages/Files';
import Projects from './pages/Projects';
import Billing from './pages/Billing';
import Messages from './pages/Messages';
import Support from './pages/Support';
import Settings from './pages/Settings';

// Frontend-only auth gate for now — backend wiring comes later.
const authed = () => !!localStorage.getItem('portal_demo_authed');

function Protected() {
  return authed() ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={authed() ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/requests/new" element={authed() ? <NewRequest /> : <Navigate to="/login" replace />} />
        <Route element={<Protected />}>
          <Route path="/home" element={<Home />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/files" element={<Files />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/invoices" element={<Navigate to="/billing" replace />} />
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/support" element={<Support />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to={authed() ? '/home' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
