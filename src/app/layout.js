// app/layout.js
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = { title: "Ledgerly" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
