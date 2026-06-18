import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = { title: 'Lead Automation Dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full">
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '13px' } }} />
      </body>
    </html>
  );
}
