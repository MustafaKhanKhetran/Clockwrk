import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Requests from './pages/Requests';
import NewRequest from './pages/NewRequest';
import Files from './pages/Files';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import ProjectDetail from './pages/ProjectDetail';
import RequestDetail from './pages/RequestDetail';
import Billing from './pages/Billing';
import Messages from './pages/Messages';
import Support from './pages/Support';
import Settings from './pages/Settings';
import MySite from './pages/MySite';

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
        <Route element={<Protected />}>
          <Route path="/home" element={<Home />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/:requestId" element={<RequestDetail />} />
          <Route path="/deliverables" element={<Files />} />
          <Route path="/files" element={<Navigate to="/deliverables" replace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<NewProject />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/invoices" element={<Navigate to="/billing" replace />} />
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/support" element={<Support />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/site" element={<MySite />} />
          {['services', 'care', 'hosting', 'domains', 'email', 'security', 'reports'].map((path) => <Route key={path} path={`/${path}`} element={<Navigate to="/site" replace />} />)}
        </Route>
        <Route path="*" element={<Navigate to={authed() ? '/home' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
