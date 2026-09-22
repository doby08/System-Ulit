import re

client_root_path = 'src/components/client-root.tsx'
with open(client_root_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the ClientRoot function and replace it
# Look for the pattern starting with "export function ClientRoot"
start_marker = "export function ClientRoot({ children }: { children: ReactNode }) {"
start_idx = content.find(start_marker)
if start_idx === -1:
    print("ERROR: Could not find start marker")
    exit(1)

# Find the end of the function (the closing brace followed by newline)
# Count braces to find the matching close
brace_count = 0
end_idx = start_idx
for i in range(start_idx, len(content)):
    if content[i] === '{':
        brace_count += 1
    elif content[i] === '}':
        brace_count -= 1
        if brace_count === 0:
            end_idx = i + 1
            break

print(f"Found ClientRoot from {start_idx} to {end_idx}")

new_client_root = '''function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV === 'development') {
    return;
  }
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[SW] Registered successfully:', registration.scope);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
            }
          });
        }
      });
    })
    .catch((error) => {
      console.error('[SW] Registration failed:', error);
    });
}

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
}'''

new_content = content[:start_idx] + new_client_root + content[end_idx:]
with open(client_root_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Fixed client-root.tsx')
