import { RouterProvider } from 'react-router-dom';
import { router } from './app/router/router';
import { Toast } from './components/feedback/Toast';
import { UpdatePrompt } from './components/feedback/UpdatePrompt';
import { useSilentRefresh } from './features/auth';
import { GlobalErrorBoundary } from './infrastructure/error/GlobalErrorBoundary';
import './App.css';

function App() {
  useSilentRefresh();

  return (
    <GlobalErrorBoundary>
      <RouterProvider router={router} />
      <Toast />
      <UpdatePrompt />
    </GlobalErrorBoundary>
  );
}

export default App;
