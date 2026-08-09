import { useLocation, useNavigate } from 'react-router-dom';

export function usePortalBack(fallback) {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    const explicitOrigin = location.state?.from;
    if (typeof explicitOrigin === 'string' && explicitOrigin.startsWith('/')) {
      navigate(explicitOrigin);
      return;
    }

    // React Router uses "default" for a direct page load. In-app navigation
    // receives a unique key, so going back restores the exact route, query,
    // filters, and browser scroll position the client came from.
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }

    navigate(fallback, { replace: true });
  };
}
