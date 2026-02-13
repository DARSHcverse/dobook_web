import "@/index.css";
import "@/App.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

export const metadata = {
  title: "DoBook",
  description: "DoBook web app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
