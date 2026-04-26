import Dashboard from "./pages/Dashboard";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

//import "./styles/global.css";

// Forge context API for getting workspace/repo info
interface ForgeContext {
  workspace?: string;
  repoSlug?: string;
  userId?: string;
}

const App: React.FC = () => {
  const [forgeContext, setForgeContext] = useState<ForgeContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
   
    initializeForgeContext();
  }, []);

  const initializeForgeContext = async () => {
    try {
     
      const testContext: ForgeContext = {
        workspace: 'your-workspace', // Replace with actual
        repoSlug: 'your-repo',        // Replace with actual
        userId: 'current-user',
      };

      setForgeContext(testContext);
    } catch (error) {
      console.error('Failed to initialize Forge context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <p>Initializing PR Orchestration...</p>
      </div>
    );
  }

  if (!forgeContext?.workspace || !forgeContext?.repoSlug) {
    return (
      <div className="error-container">
        <h2>⚠️ Configuration Error</h2>
        <p>Could not determine workspace or repository. Please configure the app.</p>
        <p>Edit src/index.tsx and set your workspace and repoSlug</p>
      </div>
    );
  }

  return (
    <Dashboard
      workspace={forgeContext.workspace}
      repoSlug={forgeContext.repoSlug}
    />
  );
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found! Make sure index.html has <div id="root"></div>');
} else {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}