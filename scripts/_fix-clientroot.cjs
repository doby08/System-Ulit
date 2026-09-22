const fs = require('fs');
const p = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit/src/components/client-root.tsx';
let content = fs.readFileSync(p, 'utf8');

// Add the ClientRoot function back
const clientRootFunc = `
export function ClientRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    registerServiceWorker();
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  return <Providers>{children}</Providers>;
}
`;

content = content.trimEnd() + '\n' + clientRootFunc;
fs.writeFileSync(p, content, 'utf8');
console.log('Added ClientRoot function back');
console.log('File length:', content.length);