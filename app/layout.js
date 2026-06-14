import "./globals.css";

export const metadata = {
  title: "سامانه انتخاب واحد و زمان‌بندی امتحانات",
  description: "پروژه دانشگاهی الگوریتم‌های گراف با Next.js"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
