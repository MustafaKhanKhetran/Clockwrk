import Sidebar from './Sidebar';
import './DashLayout.css';

export default function DashLayout({ children }) {
  return (
    <div className="dash-layout">
      <Sidebar />
      <div className="dash-main">
        <main className="dash-content">
          {children}
        </main>
      </div>
    </div>
  );
}
