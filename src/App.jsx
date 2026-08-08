import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import ToastContainer from './components/Toast';
import { PAGE_ACCESS } from './config/roles';

import Login      from './pages/Login';
import Overview   from './pages/Overview';
import Clients    from './pages/Clients';
import Projects   from './pages/Projects';
import Requests   from './pages/Requests';
import Time       from './pages/Time';
import Team       from './pages/Team';
import Finance    from './pages/Finance';
import Bookings   from './pages/Bookings';
import Calendar   from './pages/Calendar';
import MyWork     from './pages/MyWork';
import Files      from './pages/Files';
import Alerts     from './pages/Alerts';
import ComingSoon from './pages/ComingSoon';

const P = ({ roles, children }) => <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>;
const G = ({ roles, children }) => (
  <ProtectedRoute>
    <RoleGuard roles={roles} fallback={<Navigate to="/" replace />}>
      {children}
    </RoleGuard>
  </ProtectedRoute>
);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login"      element={<Login />} />
            <Route path="/"           element={<P roles={PAGE_ACCESS.overview}>   <Overview />   </P>} />
            <Route path="/overview"   element={<P roles={PAGE_ACCESS.overview}>   <Overview />   </P>} />
            <Route path="/clients"    element={<P roles={PAGE_ACCESS.clients}>    <Clients />    </P>} />
            <Route path="/projects"   element={<P roles={PAGE_ACCESS.projects}>   <Projects />   </P>} />
            <Route path="/requests"   element={<P roles={PAGE_ACCESS.requests}>   <Requests />   </P>} />
            <Route path="/my-work"    element={<G roles={['workers']}>            <MyWork />     </G>} />
            <Route path="/time"       element={<P roles={PAGE_ACCESS.time}>       <Time />       </P>} />
            <Route path="/team"       element={<P roles={PAGE_ACCESS.team}>       <Team />       </P>} />
            <Route path="/finance"    element={<P roles={PAGE_ACCESS.finance}>    <Finance />    </P>} />
            <Route path="/bookings"   element={<P roles={PAGE_ACCESS.bookings}>   <Bookings />   </P>} />
            <Route path="/calendar"   element={<G roles={['delivery', 'managers']}> <Calendar /> </G>} />
            <Route path="/alerts"     element={<P roles={PAGE_ACCESS.alerts}>     <Alerts />     </P>} />
            <Route path="/files"      element={<G roles={['allStaff']}>           <Files />      </G>} />
            <Route path="/coming-soon" element={<P roles={PAGE_ACCESS.overview}>  <ComingSoon /> </P>} />
            <Route path="/newsletter" element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/pipeline"   element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/referrals"  element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/workload"   element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/jobs"       element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/reports"    element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/health"     element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/workflows"  element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/audit"      element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/database"   element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/knowledge"  element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="/settings"   element={<P roles={PAGE_ACCESS.overview}>   <ComingSoon /> </P>} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </AuthProvider>
    </ThemeProvider>
  );
}
