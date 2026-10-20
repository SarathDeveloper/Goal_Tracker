import { Component, type ReactNode } from 'react'

interface State {
  message: string | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : 'Something went wrong' }
  }

  render() {
    if (this.state.message) {
      return (
        <div className="error-screen">
          <div className="panel">
            <h1>Goal Tracker hit a problem</h1>
            <p>{this.state.message}</p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
