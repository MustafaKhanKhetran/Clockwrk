import { Component } from 'react';
import Icon from './Icon';

/**
 * Keeps one broken page from taking down the whole portal.
 *
 * Without this, a single render error (typically a field the API did not return)
 * unmounts the entire React tree and the client sees a blank white page with the
 * nav gone — no way back except a manual reload. Here they keep the shell and can
 * navigate away. Resets automatically when the route changes.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // A new route means a new chance to render successfully.
    if (this.state.error && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    console.error('Portal page crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="v3-empty-panel" role="alert">
        <Icon name="help" size={26} />
        <strong>This page could not be displayed</strong>
        <span>Something went wrong loading it. Try another page, or reload.</span>
        <button className="v3-action is-dark" onClick={() => window.location.reload()} style={{ marginTop: 14 }}>
          <span>Reload</span>
        </button>
      </section>
    );
  }
}
