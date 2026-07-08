import type { Viewport } from "next";
import { GlobalStyle } from "@/app/components/gameStyles";

export const metadata = {
  title: "Tic-Tac-Toe",
  description: "Classic and Ultimate Tic-Tac-Toe game",
}

// Без цього мобільні браузери (Android Chrome, iOS Safari) рендерять сторінку
// в "десктопній" ширині ~980px і масштабують її, тому адаптивна верстка не діє.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <GlobalStyle />
        {children}
      </body>
    </html>
  )
}
