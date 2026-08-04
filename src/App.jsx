import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Shell from './v3/Shell';
import Login from './v3/pages/Login';
import Home from './v3/pages/Home';
import Requests from './v3/pages/Requests';
import NewRequest from './v3/pages/NewRequest';
import Deliverables from './v3/pages/Deliverables';
import Projects from './v3/pages/Projects';
import NewProject from './v3/pages/NewProject';
import ProjectDetail from './v3/pages/ProjectDetail';
import RequestDetail from './v3/pages/RequestDetail';
import Billing from './v3/pages/Billing';
import Messages from './v3/pages/Messages';
import Support from './v3/pages/Support';
import Settings from './v3/pages/Settings';
import Site from './v3/pages/Site';

// Frontend-only auth gate for now — backend wiring comes later.
const authed = () => !!localStorage.getItem('portal_demo_authed');

function Protected() {
  return authed() ? <Shell><Outlet /></Shell> : <Navigate to="/login" replace />;
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
          <Route path="/deliverables" element={<Deliverables />} />
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
          <Route path="/site" element={<Site />} />
          {['services', 'care', 'hosting', 'domains', 'email', 'security', 'reports'].map((path) => <Route key={path} path={`/${path}`} element={<Navigate to="/site" replace />} />)}
        </Route>
        <Route path="*" element={<Navigate to={authed() ? '/home' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
